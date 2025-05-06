
document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements
    const codeEditor = document.getElementById('code-editor');
    const textarea = document.getElementById('responseBody');
    const lineNumbers = document.querySelector('.line-numbers');
    const headersContainer = document.getElementById('headers-container');
    const addHeaderBtn = document.getElementById('add-header');
    const saveBtn = document.getElementById('save-btn');

    const statusCodeSelect = document.getElementById('statusCode');
    const statusDescription = document.getElementById('statusDescription');

    // Status code descriptions
    const statusDescriptions = {
        '200': 'Standard response for successful HTTP requests.',
        '201': 'The request has been fulfilled, resulting in the creation of a new resource.',
        '202': 'The request has been accepted for processing, but the processing has not been completed.',
        '204': 'The server successfully processed the request, but is not returning any content.',
        '301': 'The requested resource has been assigned a new permanent URL.',
        '302': 'The requested resource resides temporarily under a different URL.',
        '304': 'Indicates that the resource has not been modified since the last request.',
        '400': 'The server cannot or will not process the request due to an apparent client error.',
        '401': 'Authentication is required and has failed or has not yet been provided.',
        '403': 'The request was valid, but the server is refusing action.',
        '404': 'The requested resource could not be found.',
        '422': 'The request was well-formed but unable to be followed due to semantic errors.',
        '429': 'The user has sent too many requests in a given amount of time.',
        '500': 'A generic error message when the server encounters an unexpected condition.',
        '502': 'The server was acting as a gateway or proxy and received an invalid response.',
        '503': 'The server is currently unavailable (overloaded or down for maintenance).',
        '504': 'The server was acting as a gateway or proxy and did not receive a timely response.'
    };

    // Common header suggestions
    const commonHeaders = [
        'Content-Type',
        'Authorization',
        'Accept',
        'Cache-Control',
        'X-API-Key',
        'Access-Control-Allow-Origin',
    ];

    // Initialize with an empty header
    let headers = [{ key: '', value: '' }];

    // Initialize line numbers
    function updateLineNumbers() {
        const lines = textarea.value.split('\n').length;
        let lineNumbersHTML = '';

        for (let i = 1; i <= lines; i++) {
            lineNumbersHTML += `<div>${i}</div>`;
        }

        lineNumbers.innerHTML = lineNumbersHTML;
    }

    // Handle textarea input
    textarea.addEventListener('input', function() {
        updateLineNumbers();
    });

    // Sync textarea scroll with line numbers
    textarea.addEventListener('scroll', function() {
        lineNumbers.scrollTop = textarea.scrollTop;
    });

    // Initialize with at least one line
    updateLineNumbers();


    // Handle status code change
    statusCodeSelect.addEventListener('change', function() {
        const selectedCode = this.value;
        statusDescription.textContent = statusDescriptions[selectedCode] || '';

        // Optionally set default headers based on status code
        if (selectedCode === '204') {
            // For 204 No Content, typically there's no body
            textarea.value = '';
            updateLineNumbers();
        }
    });

    // Render header inputs
    function renderHeaders() {
        headersContainer.innerHTML = '';

        headers.forEach((header, index) => {
            const headerItem = document.createElement('div');
            headerItem.className = 'header-item';

            // Create key input with datalist for suggestions
            const keyDiv = document.createElement('div');
            keyDiv.style.flex = '1';

            const keyInput = document.createElement('input');
            keyInput.className = 'header-input';
            keyInput.placeholder = 'Header name';
            keyInput.value = header.key;
            keyInput.setAttribute('list', `header-suggestions-${index}`);

            const datalist = document.createElement('datalist');
            datalist.id = `header-suggestions-${index}`;

            commonHeaders.forEach(suggestion => {
                const option = document.createElement('option');
                option.value = suggestion;
                datalist.appendChild(option);
            });

            keyInput.addEventListener('input', function() {
                headers[index].key = this.value;
            });

            keyDiv.appendChild(keyInput);
            keyDiv.appendChild(datalist);
            headerItem.appendChild(keyDiv);

            // Create value input
            const valueDiv = document.createElement('div');
            valueDiv.style.flex = '1';

            const valueInput = document.createElement('input');
            valueInput.className = 'header-input';
            valueInput.placeholder = 'Value';
            valueInput.value = header.value;

            valueInput.addEventListener('input', function() {
                headers[index].value = this.value;
            });

            valueDiv.appendChild(valueInput);
            headerItem.appendChild(valueDiv);

            // Create remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn btn-icon btn-outline';
            removeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
            removeBtn.disabled = headers.length === 1;

            removeBtn.addEventListener('click', function() {
                headers.splice(index, 1);
                renderHeaders();
            });

            headerItem.appendChild(removeBtn);
            headersContainer.appendChild(headerItem);
        });
    }

    // Add header button
    addHeaderBtn.addEventListener('click', function() {
        headers.push({ key: '', value: '' });
        renderHeaders();
    });

// Save settings
    saveBtn.addEventListener('click', function() {
        let parsedBody;

        try {
            // Try to parse the body as JSON if it's not empty
            parsedBody = textarea.value.trim() ? textarea.value.trim() : '{}';
            const statusCode = statusCodeSelect.value;

            // Convert headers array to object
            const headersObject = headers.reduce((acc, header) => {
                if (header.key.trim()) {
                    acc[header.key] = header.value;
                }
                return acc;
            }, {});

            const formData = {
                status: statusCode,
                body: parsedBody,
                headers: headersObject
            };

            console.log('Form submitted:', formData);

            const sessionIdElement = document.getElementById('session-id');
            const sessionId = sessionIdElement.dataset.sessionId;

            // 🔥 POST to Django backend
            fetch(`/edit-response/${sessionId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'X-CSRFToken': getCSRFToken()  // ← if you're using CSRF protection
                },
                body: JSON.stringify(formData)
            })
                .then(response => {
                    if (response.ok) {
                        // Redirect to the view_session page after successful save
                        window.location.href = `/view/${sessionId}/`;
                    }
                    else if (response.status >= 300 && response.status < 400)
                    {
                        window.location.href = `/view/${sessionId}/`;
                    }
                    else {
                        throw new Error('Failed to save response settings');
                    }
                })

                .catch(error => {
                    alert('Failed to save response settings');
                    console.error(error);
                });

        } catch (error) {
            alert('Invalid JSON in response body');
            console.error('JSON parsing error:', error);
        }
    });


    // Initialize headers rendering
    renderHeaders();
});