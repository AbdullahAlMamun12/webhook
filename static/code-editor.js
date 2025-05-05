
document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements
    const codeEditor = document.getElementById('code-editor');
    const textarea = document.getElementById('responseBody');
    const lineNumbers = document.querySelector('.line-numbers');
    const headersContainer = document.getElementById('headers-container');
    const addHeaderBtn = document.getElementById('add-header');
    const saveBtn = document.getElementById('save-btn');

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
            parsedBody = textarea.value.trim() ? textarea.value.trim() : {};

            // Convert headers array to object
            const headersObject = headers.reduce((acc, header) => {
                if (header.key.trim()) {
                    acc[header.key] = header.value;
                }
                return acc;
            }, {});

            const formData = {
                body: parsedBody,
                headers: headersObject
            };

            console.log('Form submitted:', formData);
            // alert('Response settings saved successfully');

            // Here you would typically send this data to your backend

        } catch (error) {
            alert('Invalid JSON in response body');
            console.error('JSON parsing error:', error);
        }
    });

    // Initialize headers rendering
    renderHeaders();
});