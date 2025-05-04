from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from .models import Session, WebhookRequest
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.shortcuts import render, get_object_or_404, redirect
from django.urls import reverse  # Import the reverse function
from django.utils import timezone
import json



def humanize_bytes(bytes):
    """Converts bytes to a human-readable format."""
    if bytes is None:
        return "N/A"
    units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
    i = 0
    while bytes >= 1024 and i < len(units) - 1:
        bytes /= 1024
        i += 1
    return f"{bytes:.1f} {units[i]}"

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


def edit_response(request, session_id):
    session = get_object_or_404(Session, id=session_id)

    if request.method == "POST":
        session.response_status = int(request.POST.get("status"))
        session.response_body = request.POST.get("body")
        try:
            session.response_headers = json.loads(request.POST.get("headers"))
        except json.JSONDecodeError:
            session.response_headers = {}
        session.save()
        return redirect(f"/edit-response/{session_id}/")

    return render(request, "edit_response.html", {"session": session})


@csrf_exempt

def receive_hook(request, session_id):

    session = get_object_or_404(Session, id=session_id)
    headers = {k: v for k, v in request.headers.items()}
    body = request.body.decode('utf-8', errors='replace')
    query_params = request.GET.dict()
    request_size = len(request.body) if hasattr(request, 'body') else 0

    wr = WebhookRequest.objects.create(
        session=session,
        method=request.method,
        headers=headers,
        body=body,
        query_params=query_params,
        request_size=request_size  # Store the request size here
    )
    response_body = session.response_body
    response_headers = session.response_headers
    response_status = session.response_status
    content_type = response_headers.get('Content-Type', 'application/json')
    response_size_bytes = len(response_body.encode('utf-8')) if response_body else 0


    # ✅ This is the PRODUCER step!
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"logs_{session_id}",
        {
            "type": "new_webhook",
            "data": {
                "method": wr.method,
                "content_type": wr.headers.get('Content-Type', 'application/json'),
                "body": wr.body[:300],
                "request_size": humanize_bytes(wr.request_size),  # Use the stored request size
                "response_size": humanize_bytes(response_size_bytes),  # Approximate response size
                "timestamp": timezone.now().isoformat(), # Use timezone.now() for consistency
            }
        }
    )

    # Return the user's custom response
    return HttpResponse(
        content=response_body,
        status=response_status,
        content_type=content_type,
        headers=response_headers
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