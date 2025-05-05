from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from .models import Session, WebhookRequest, RequestInfo, RequestData, ResponseData
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.shortcuts import render, get_object_or_404, redirect
from django.urls import reverse  # Import the reverse function
from django.utils import timezone
from .utils import humanize_bytes
from io import BytesIO
from urllib.parse import parse_qs

import json

def new_session(request):
    """
    Creates a new Django session, stores the session ID, and redirects the user
    to a view that displays the session ID.  It first checks if a session already
    exists for the user.
    """
    if request.session.session_key:
        session_id = request.session.session_key
    else:
        session = Session.objects.create()  # Create a new session in the database
        session_id = str(session.id)
        request.session['session_id'] = session_id  # Store the session ID as a string
    # Use reverse to generate the URL for the view_session view
    view_session_url = reverse('view_session', kwargs={'session_id': session_id})
    return redirect(view_session_url)  # Redirect to the view_session view


@csrf_exempt
def view_session(request, session_id):
    """
    View that retrieves and displays the session ID.
    """
    #  get the session_id from the session, or the url
    retrieved_session_id = request.session.get('session_id', session_id)
    return render(request, "home.html", {"session_id": retrieved_session_id})


@csrf_exempt
def edit_response(request, session_id):
    session = get_object_or_404(Session, id=session_id)

    if request.method == "POST":
        data = json.loads(request.body.decode('utf-8'))
        session.response_status = int(data.get('status', 200))
        session.response_body = data.get('body', '')
        try:
            session.response_headers = data.get('headers', {})
        except json.JSONDecodeError:
            session.response_headers = {}
        session.save()

        return redirect(reverse('view_session', kwargs={'session_id': session_id}))

    return render(request, "update-response.html", {"session_id": session_id})


@csrf_exempt
def receive_hook(request, session_id):

    session = get_object_or_404(Session, id=session_id)

    if not session.response_headers:
        session.response_headers = {
            'Content-Type': 'application/json',
            'X-Default-Header': 'DefaultValue'
        }
        session.save()



    info = RequestInfo(
        method=request.method,
        path=request.headers.get('host')+request.path,
        request_data=RequestData(
            headers=request.headers,
            body=request.body,
            query_params=request.GET,
            size=len(request.body)
        ),
        response_data=ResponseData(
            headers=session.response_headers,
            body=session.response_body,
            size=len(session.response_body)
        )
    )

    # ✅ This is the PRODUCER step!
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"logs_{session_id}",
        {
            "type": "new_webhook",
            "data": info.to_dict()
        }
    )


    return HttpResponse(
        content=session.response_body,
        status=session.response_status,
        headers=session.response_headers
    )


@csrf_exempt
def view_logs(request, session_id):
    try:
        session = Session.objects.get(id=session_id)
    except Session.DoesNotExist:
        raise Http404("Session not found")

    requests = WebhookRequest.objects.filter(session=session).order_by('-timestamp')
    data = [{
        "method": r.method,
        "headers": r.headers,
        "body": r.body,
        "query_params": r.query_params,
        "timestamp": r.timestamp.isoformat()
    } for r in requests]

    return JsonResponse(data, safe=False)