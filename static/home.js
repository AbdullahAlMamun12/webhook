document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const endpointUrlElement = document.getElementById('endpointUrl');
    const copyEndpointButton = document.getElementById('copyEndpoint');
    const liveMode = document.getElementById('liveMode');
    const clearRequests = document.getElementById('clearRequests');
    const requestList = document.getElementById('requestList');
    const requestCountElement = document.getElementById('requestCount');
    const emptyRequestMessage = document.getElementById('emptyRequestMessage');
    const emptyDetails = document.getElementById('emptyDetails');
    const requestDetailsHeader = document.getElementById('requestDetailsHeader');
    const requestMethodElement = document.getElementById('requestMethod');
    const requestPathElement = document.getElementById('requestPath');
    const requestTimeElement = document.getElementById('requestTime');
    const requestMetaElement = document.getElementById('requestMeta');
    const requestDetailsTabs = document.getElementById('requestDetailsTabs');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const headersContent = document.getElementById('headersContent');
    const queryContent = document.getElementById('queryContent');
    const bodyContent = document.getElementById('bodyContent');
    const rawContent = document.getElementById('rawContent');
    const copyButtons = document.querySelectorAll('[data-copy]');

    // State
    let requests = [];
    let selectedRequestId = null;
    let selectedRequest = null;
    let isLive = true;
    let intervalId = null;

    // Generate random endpoint URL
    const endpoint = generateEndpointUrl();
    endpointUrlElement.textContent = endpoint;

    // Initialize with mock data
    const initialRequests = generateMockRequests();
    requests = initialRequests;
    renderRequestsList();

    // Set up live mode interval
    startLiveMode();

    // Event Listeners
    copyEndpointButton.addEventListener('click', copyEndpoint);
    liveMode.addEventListener('click', toggleLiveMode);
    clearRequests.addEventListener('click', clearAllRequests);

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabName = button.getAttribute('data-tab');
            document.getElementById(tabName + 'Tab').classList.add('active');
        });
    });

    // Copy button functionality
    copyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const contentType = button.getAttribute('data-copy');
            let contentToCopy = '';

            switch(contentType) {
                case 'headers':
                    contentToCopy = headersContent.textContent;
                    break;
                case 'query':
                    contentToCopy = queryContent.textContent;
                    break;
                case 'body':
                    contentToCopy = bodyContent.textContent;
                    break;
                case 'raw':
                    contentToCopy = rawContent.textContent;
                    break;
            }

            navigator.clipboard.writeText(contentToCopy);
            showToast('Copied to clipboard!', 'success');
        });
    });

    // Functions
    function generateEndpointUrl() {
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        return `https://${uuid}.webhook.echoverse.io/`;
    }

    function copyEndpoint() {
        navigator.clipboard.writeText(endpoint);
        showToast('Endpoint URL copied to clipboard!', 'success');
    }

    function toggleLiveMode() {
        isLive = !isLive;
        liveMode.textContent = isLive ? 'Live Mode ON' : 'Live Mode OFF';

        startLiveMode();
        if (isLive) {
            liveMode.classList.add('live-active');
            liveMode.innerHTML = '<span class="badge-ping"></span>Live Mode ON';
            // startLiveMode();
        } else {
            liveMode.classList.remove('live-active');
            liveMode.textContent = 'Live Mode OFF';
            clearInterval(intervalId);
        }

        showToast(isLive ? 'Live mode enabled' : 'Live mode disabled', 'success');
    }

    function startLiveMode() {
        const sessionId = '279d4c37-d8e6-47d6-b83a-d72d00f65894';
        const wsUrl = `ws://localhost:8000/ws/logs/${sessionId}/`;

        if (!window.liveSocket || window.liveSocket.readyState === WebSocket.CLOSED) {
            window.liveSocket = new WebSocket(wsUrl);

            window.liveSocket.onopen = () => {
                console.log('✅ Connected to Django WebSocket');
                window.liveSocket.send('Hello from browser client');
            };

            window.liveSocket.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);

                    if (parsed.method && parsed.body) {
                        console.log('📨 Webhook Received:');
                        console.log(`📌 Method: ${parsed.method}`);
                        console.log(`📝 Body: ${parsed.body}`);
                        console.log(`⏰ Timestamp: ${parsed.timestamp}`);
                        console.log('---');
                    } else {
                        console.log('📨 New-webhook message:', parsed);
                    }


                    const newRequests = generateMockRequests().slice(0, 1); // Get just one new mock request
                    requests = [...newRequests, ...requests];
                    renderRequestsList();

                    showToast('New webhook request received', 'info');

                } catch (err) {
                    console.error('❌ Failed to parse WebSocket message:', err.message);
                    console.log('Raw data:', event.data.toString());
                }
            };

            window.liveSocket.onclose = () => {
                console.warn('🔌 WebSocket disconnected');
            };

            window.liveSocket.onerror = (err) => {
                console.error('❌ WebSocket error:', err.message);
            };
        }
        else {
            window.liveSocket.close();
            window.liveSocket = null;
            console.log('🚫 Disconnected from WebSocket');
        }
    }

    function clearAllRequests() {
        requests = [];
        selectedRequestId = null;
        selectedRequest = null;
        renderRequestsList();
        resetDetailsView();
        showToast('All requests cleared', 'success');
    }

    function renderRequestsList() {
        requestList.innerHTML = '';
        requestCountElement.textContent = `${requests.length} ${requests.length === 1 ? 'Request' : 'Requests'}`;

        if (requests.length === 0) {
            emptyRequestMessage.classList.remove('hidden');
            requestList.classList.add('hidden');
        } else {
            emptyRequestMessage.classList.add('hidden');
            requestList.classList.remove('hidden');

            requests.forEach(request => {
                const requestItem = createRequestItem(request);
                requestList.appendChild(requestItem);
            });
        }
    }

    function createRequestItem(request) {
        const item = document.createElement('div');
        item.className = `request-item ${selectedRequestId === request.id ? 'selected' : ''}`;
        item.dataset.id = request.id;

        const methodColor = getMethodColor(request.method);
        const formattedTime = formatTimeAgo(request.timestamp);
        const formattedSize = formatSize(request.size);

        item.innerHTML = `
      <div class="method-row">
        <div class="method-path">
          <span class="method-badge ${methodColor}">${request.method}</span>
          <span class="request-path">${request.path}</span>
        </div>
        <div class="request-time">${formattedTime}</div>
      </div>
      <div class="request-meta-row">
        <div>${request.contentType || 'Unknown type'}</div>
        <div>${formattedSize}</div>
      </div>
    `;

        item.addEventListener('click', () => {
            selectRequest(request.id);
        });

        return item;
    }

    function selectRequest(id) {
        // Update selected state in list
        document.querySelectorAll('.request-item').forEach(item => {
            item.classList.remove('selected');
            if (item.dataset.id === id) {
                item.classList.add('selected');
            }
        });

        selectedRequestId = id;
        const detailedRequest = getDetailedRequest(id);
        selectedRequest = detailedRequest;

        if (detailedRequest) {
            showDetailsView(detailedRequest);
        } else {
            resetDetailsView();
        }
    }

    function showDetailsView(request) {
        // Hide empty state, show details
        emptyDetails.classList.add('hidden');
        requestDetailsHeader.classList.remove('hidden');
        requestDetailsTabs.classList.remove('hidden');

        // Set method and path
        const methodColor = getMethodColor(request.method);
        requestMethodElement.className = `method-badge ${methodColor}`;
        requestMethodElement.textContent = request.method;
        requestPathElement.textContent = request.path;
        requestTimeElement.textContent = request.timestamp.toLocaleString();

        // Set meta info (IP and User Agent)
        requestMetaElement.innerHTML = `
      <span>${request.ipAddress}</span>
      <span class="truncate">${request.userAgent}</span>
    `;

        // Set tab contents
        headersContent.textContent = formatJson(request.headers);
        queryContent.textContent = formatJson(request.query);
        bodyContent.textContent = formatJson(request.body);
        rawContent.textContent = request.rawBody;

        // Make sure headers tab is active by default
        document.querySelector('.tab-button[data-tab="headers"]').click();
    }

    function resetDetailsView() {
        emptyDetails.classList.remove('hidden');
        requestDetailsHeader.classList.add('hidden');
        requestDetailsTabs.classList.add('hidden');
    }

    function getMethodColor(method) {
        const colors = {
            'GET': 'method-get',
            'POST': 'method-post',
            'PUT': 'method-put',
            'DELETE': 'method-delete',
            'PATCH': 'method-patch'
        };

        return colors[method] || '';
    }

    function formatTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);

        let interval = Math.floor(seconds / 31536000);
        if (interval >= 1) return interval + " year" + (interval === 1 ? "" : "s") + " ago";

        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) return interval + " month" + (interval === 1 ? "" : "s") + " ago";

        interval = Math.floor(seconds / 86400);
        if (interval >= 1) return interval + " day" + (interval === 1 ? "" : "s") + " ago";

        interval = Math.floor(seconds / 3600);
        if (interval >= 1) return interval + " hour" + (interval === 1 ? "" : "s") + " ago";

        interval = Math.floor(seconds / 60);
        if (interval >= 1) return interval + " minute" + (interval === 1 ? "" : "s") + " ago";

        return Math.floor(seconds) + " second" + (seconds === 1 ? "" : "s") + " ago";
    }

    function formatSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function formatJson(data) {
        try {
            return JSON.stringify(data, null, 2);
        } catch (e) {
            return String(data);
        }
    }

    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('toast-removing');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // Mock data generation
    function generateMockRequests() {

        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        const paths = [
            '/api/users',
            '/api/products',
            '/api/orders',
            '/api/payment',
            '/api/notification',
            '/api/event',
            '/webhook/stripe',
            '/webhook/github'
        ];
        const contentTypes = [
            'application/json',
            'text/plain',
            'application/xml',
            'application/x-www-form-urlencoded',
            'multipart/form-data'
        ];

        const count = Math.floor(Math.random() * 5) + 3; // 3-7 requests
        const requests = [];

        for (let i = 0; i < count; i++) {
            const method = methods[Math.floor(Math.random() * methods.length)];
            const path = paths[Math.floor(Math.random() * paths.length)];
            const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
            const size = Math.floor(Math.random() * 10000) + 1000; // 1KB - 11KB

            const now = new Date();
            const timestamp = new Date(now.getTime() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)); // Random time in last 24 hours

            requests.push({
                id: 'req_' + Math.random().toString(36).substr(2, 9),
                method,
                path,
                timestamp,
                contentType,
                size
            });
        }

        return requests;
    }

    function getDetailedRequest(id) {
        const request = requests.find(r => r.id === id);
        if (!request) return null;

        return {
            ...request,
            ipAddress: '192.168.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255),
            userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
            headers: {
                'host': 'api.example.com',
                'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
                'content-type': request.contentType || 'application/json',
                'accept': '*/*',
                'accept-encoding': 'gzip, deflate, br',
                'connection': 'keep-alive',
                'x-request-id': 'req_' + Math.random().toString(36).substr(2, 9),
                'x-forwarded-for': '192.168.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255)
            },
            query: {
                'page': '1',
                'limit': '10',
                'sort': 'desc',
                'filter': 'active'
            },
            body: {
                'id': Math.floor(Math.random() * 1000),
                'name': 'Sample Product',
                'price': Math.floor(Math.random() * 10000) / 100,
                'quantity': Math.floor(Math.random() * 100),
                'description': 'This is a sample product description',
                'created_at': new Date().toISOString()
            },
            rawBody: JSON.stringify({
                'id': Math.floor(Math.random() * 1000),
                'name': 'Sample Product',
                'price': Math.floor(Math.random() * 10000) / 100,
                'quantity': Math.floor(Math.random() * 100),
                'description': 'This is a sample product description',
                'created_at': new Date().toISOString()
            })
        };
    }
});