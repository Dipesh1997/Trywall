document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    const clearButton = document.getElementById('clearButton');
    const newPolygonBtn = document.getElementById('newPolygonBtn');
    const finishPolygonBtn = document.getElementById('finishPolygonBtn');
    const saveCanvasBtn = document.getElementById('saveCanvasBtn');
    const polygonContainer = document.getElementById('polygonContainer');
    const floatingColorPicker = document.getElementById('floatingColorPicker');
    const floatingColorInput = document.getElementById('floatingColorInput');
    const opacitySlider = document.getElementById('opacitySlider');
    const opacityValue = document.getElementById('opacityValue');
    const imagePickerBtn = document.getElementById('imagePickerBtn');
    const imageInput = document.getElementById('imageInput');
    let backgroundImage = null;

    // Variables for drawing
    let currentPoints = [];
    let polygons = [];
    let isDrawing = true;
    let selectedPolygonIndex = -1;
    let activePolygonIndex = -1;
    let isCutoutMode = false;
    let cutoutPoints = [];
    let parentPolygonIndex = -1;
    let cutoutCount = 0;

    // Color picker state
    let isColorPickerActive = false;

    // Add this to track original colors and active blend states
    let originalColor = null;
    let activeBlendMode = null;

    // Add these functions at the beginning of your script
    function getCanvasScaleFactor() {
        const rect = canvas.getBoundingClientRect();
        return {
            x: canvas.width / rect.width,
            y: canvas.height / rect.height
        };
    }

    function getScaledCoordinates(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scale = getCanvasScaleFactor();
        return {
            x: (clientX - rect.left) * scale.x,
            y: (clientY - rect.top) * scale.y
        };
    }

    // Initialize tabs
    function initializeTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons and panes
                tabButtons.forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
                
                // Add active class to clicked button and corresponding pane
                button.classList.add('active');
                const tabName = button.getAttribute('data-tab');
                document.getElementById(tabName + 'Colors').classList.add('active');
            });
        });
    }

    // Initialize color cards for each category
    function initializeColorCards() {
        const categories = ['light', 'medium', 'dark'];
        let globalPageNumber = 1; // Starting page number
        
        categories.forEach(category => {
            const container = document.getElementById(category + 'Colors');
            if (!container) return;
            
            container.innerHTML = '';
            const colors = colorData[category];
            
            // Process colors in groups of 8
            for (let i = 0; i < colors.length; i++) {
                const color = colors[i];
                const currentPageNumber = Math.floor(i / 8) + globalPageNumber; // Calculate current page
                
                // Create color card
                const card = document.createElement('div');
                card.className = 'color-card';
                card.style.backgroundColor = color.value;
                card.setAttribute('data-color', color.value);
                card.setAttribute('data-number', color.number);
                card.setAttribute('data-name', color.name);
                card.setAttribute('data-page', currentPageNumber);
                
                const numberDiv = document.createElement('div');
                numberDiv.className = 'color-number';
                numberDiv.textContent = `#${color.number}`;
                
                const nameDiv = document.createElement('div');
                nameDiv.className = 'color-name';
                nameDiv.textContent = color.name;
                
                card.appendChild(numberDiv);
                card.appendChild(nameDiv);
                
                // Add drag functionality
                card.draggable = true;
                card.addEventListener('dragstart', function(e) {
                    const colorData = {
                        value: color.value,
                        number: color.number.trim(),
                        name: color.name,
                        pageNumber: currentPageNumber
                    };
                    e.dataTransfer.setData('application/json', JSON.stringify(colorData));
                });

                container.appendChild(card);
                
                // Add separator after every 8 colors or at the end
                if ((i + 1) % 8 === 0 || i === colors.length - 1) {
                    const separator = document.createElement('div');
                    separator.className = 'color-separator';
                    
                    // Create circle with page number
                    const circle = document.createElement('div');
                    circle.className = 'page-circle';
                    circle.textContent = currentPageNumber;
                    separator.appendChild(circle);
                    
                    container.appendChild(separator);
                }
            }
            
            // Update global page number for next category
            const totalPages = Math.ceil(colors.length / 8);
            globalPageNumber += totalPages;
        });
    }

    // Search functionality
    document.getElementById('colorSearch').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.color-card');
        
        cards.forEach(card => {
            const colorNumber = card.getAttribute('data-number').toLowerCase();
            const colorName = card.querySelector('.color-name').textContent.toLowerCase();
            const colorValue = card.getAttribute('data-color').toLowerCase();
            
            if (colorNumber.includes(searchTerm) || 
                colorName.includes(searchTerm) || 
                colorValue.includes(searchTerm)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    });

    // Preset color buttons click handler
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (activePolygonIndex !== -1) {
                const currentOpacity = activePolygonIndex !== -1 ? 
                    getOpacityFromRgba(polygons[activePolygonIndex].color) : 
                    opacitySlider.value / 100;
                polygons[activePolygonIndex].color = hexToRgba(this.getAttribute('data-color'), currentOpacity);
                floatingColorInput.value = this.getAttribute('data-color');
                redrawCanvas();
            }
        });
    });

    // Drag and drop functionality
    function handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.color);
    }

    // Add these event listeners to the canvas
    canvas.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    canvas.addEventListener('drop', function(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        try {
            const colorData = JSON.parse(e.dataTransfer.getData('application/json'));
            console.log('Dropped color data:', colorData); // Debug log
            
            // Find the polygon under the drop position
            for (let i = polygons.length - 1; i >= 0; i--) {
                if (isPointInPolygon(x, y, polygons[i].points)) {
                    const currentOpacity = getOpacityFromRgba(polygons[i].color);
                    polygons[i].color = hexToRgba(colorData.value, currentOpacity);
                    polygons[i].hexColor = colorData.value;
                    polygons[i].colorInfo = {
                        number: colorData.number,
                        name: colorData.name,
                        pageNumber: colorData.pageNumber // Store the page number from dragged color
                    };
                    console.log('Updated polygon:', polygons[i]); // Debug log
                    redrawCanvas();
                    updatePolygonList();
                    break;
                }
            }
        } catch (error) {
            console.error('Error processing dropped color:', error);
        }
    });

    // Helper function to find polygon at point
    function findPolygonAtPoint(x, y) {
        for (const polygon of polygons) {
            if (isPointInPolygon(x, y, polygon.points)) {
                return polygon;
            }
        }
        return null;
    }

    // Helper function to check if point is inside polygon
    function isPointInPolygon(x, y, points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            
            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    // Set canvas size
    function resizeCanvas() {
        const container = canvas.parentElement;
        const maxWidth = Math.min(800, window.innerWidth - 40);
        
        // Set the canvas's internal dimensions
        canvas.width = maxWidth;
        canvas.height = 500;
        
        // Set the display size to match
        canvas.style.width = maxWidth + 'px';
        canvas.style.height = '500px';
        
        redrawCanvas();
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Color functions
    function hexToRgba(hex, alpha = 1) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Helper function to extract opacity from rgba color
    function getOpacityFromRgba(rgba) {
        const match = rgba.match(/[\d.]+/g);
        if (match && match.length === 4) {
            return parseFloat(match[3]);
        }
        return 1;
    }

    // Helper function to convert rgba to hex
    function rgbaToHex(rgba) {
        const match = rgba.match(/[\d.]+/g);
        if (match && match.length >= 3) {
            const r = parseInt(match[0]);
            const g = parseInt(match[1]);
            const b = parseInt(match[2]);
            return '#' + [r, g, b].map(x => {
                const hex = x.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        }
        return '#000000';
    }

    // Drawing functions
    function drawPoint(x, y) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#4CAF50';
        ctx.fill();
        ctx.closePath();
    }

    function drawLine(start, end) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Add this helper function to calculate polygon centroid
    function calculatePolygonCentroid(points) {
        let xSum = 0;
        let ySum = 0;
        for (let i = 0; i < points.length; i++) {
            xSum += points[i].x;
            ySum += points[i].y;
        }
        return {
            x: xSum / points.length,
            y: ySum / points.length
        };
    }

    // Modify the drawPolygon function to properly handle cutouts and background
    function drawPolygon(points, color, isSelected = false, index) {
        if (points.length < 3) return;
        
        ctx.save();
        
        // Draw the main polygon
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();

        // Draw cutouts if they exist
        if (polygons[index] && polygons[index].cutouts) {
            for (let cutout of polygons[index].cutouts) {
                ctx.moveTo(cutout[0].x, cutout[0].y);
                for (let i = 1; i < cutout.length; i++) {
                    ctx.lineTo(cutout[i].x, cutout[i].y);
                }
                ctx.closePath();
            }
        }

        // Fill the polygon with color
        ctx.fillStyle = color;
        ctx.fill();

        // Draw the stroke
        ctx.strokeStyle = color.replace('rgba', 'rgb').replace(/,[^,]*\)/, ')');
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke();

        if (isSelected) {
            ctx.strokeStyle = '#2196F3';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Handle cutouts - make them transparent and show background
        if (polygons[index] && polygons[index].cutouts) {
            // Create transparent cutouts
            ctx.globalCompositeOperation = 'destination-out';
            
            for (let cutout of polygons[index].cutouts) {
                ctx.beginPath();
                ctx.moveTo(cutout[0].x, cutout[0].y);
                for (let i = 1; i < cutout.length; i++) {
                    ctx.lineTo(cutout[i].x, cutout[i].y);
                }
                ctx.closePath();
                ctx.fill();
            }

            // Reset composite operation
            ctx.globalCompositeOperation = 'source-over';

            // Draw background or white color in cutout areas
            for (let cutout of polygons[index].cutouts) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(cutout[0].x, cutout[0].y);
                for (let i = 1; i < cutout.length; i++) {
                    ctx.lineTo(cutout[i].x, cutout[i].y);
                }
                ctx.closePath();
                ctx.clip();

                if (backgroundImage) {
                    // If there's a background image, draw it in the cutout
                    const scale = Math.min(canvas.width / backgroundImage.width, canvas.height / backgroundImage.height);
                    const x = (canvas.width - backgroundImage.width * scale) / 2;
                    const y = (canvas.height - backgroundImage.height * scale) / 2;
                    ctx.drawImage(backgroundImage, x, y, backgroundImage.width * scale, backgroundImage.height * scale);
                } else {
                    // If no background image, fill with white
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.restore();
            }

            // Draw cutout borders
            for (let cutout of polygons[index].cutouts) {
                ctx.beginPath();
                ctx.moveTo(cutout[0].x, cutout[0].y);
                for (let i = 1; i < cutout.length; i++) {
                    ctx.lineTo(cutout[i].x, cutout[i].y);
                }
                ctx.closePath();
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        // Draw cutout in progress if this is the active polygon
        if (isCutoutMode && index === parentPolygonIndex && cutoutPoints.length > 0) {
            ctx.beginPath();
            ctx.moveTo(cutoutPoints[0].x, cutoutPoints[0].y);
            for (let i = 1; i < cutoutPoints.length; i++) {
                ctx.lineTo(cutoutPoints[i].x, cutoutPoints[i].y);
            }
            if (cutoutPoints.length >= 2) {
                ctx.strokeStyle = '#f44336';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            // Draw points for cutout
            cutoutPoints.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#f44336';
                ctx.fill();
                ctx.closePath();
            });
        }

        ctx.restore();
    }

    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background image if exists
        if (backgroundImage) {
            const scale = Math.min(canvas.width / backgroundImage.width, canvas.height / backgroundImage.height);
            const x = (canvas.width - backgroundImage.width * scale) / 2;
            const y = (canvas.height - backgroundImage.height * scale) / 2;
            ctx.drawImage(backgroundImage, x, y, backgroundImage.width * scale, backgroundImage.height * scale);
        }

        // Draw all completed polygons
        polygons.forEach((polygon, index) => {
            const isActive = index === activePolygonIndex;
            drawPolygon(polygon.points, polygon.color, index === selectedPolygonIndex || isActive, index);
        });
        
        // Draw current polygon in progress
        if (currentPoints.length > 0) {
            // Draw lines between points
            for (let i = 0; i < currentPoints.length - 1; i++) {
                drawLine(currentPoints[i], currentPoints[i + 1]);
            }
            
            // Draw points
            currentPoints.forEach(point => drawPoint(point.x, point.y));
            
            // Draw polygon preview if we have enough points
            if (currentPoints.length >= 3) {
                const previewPoints = [...currentPoints];
                drawPolygon(previewPoints, 'rgba(76, 175, 80, 0.2)', false, -1);
            }
        }
    }

    // Event listeners
    canvas.addEventListener('click', handleCanvasClick);

    function showColorPicker() {
        // Reset blend mode state
        activeBlendMode = null;
        originalColor = null;
        document.getElementById('lightenBtn').classList.remove('active');
        document.getElementById('darkenBtn').classList.remove('active');
        document.getElementById('multiplyBtn').classList.remove('active');
        
        // Existing color picker show logic...
        floatingColorPicker.style.display = 'block';
        if (activePolygonIndex !== -1) {
            const currentColor = polygons[activePolygonIndex].color;
            const opacity = Math.round(getOpacityFromRgba(currentColor) * 100);
            opacitySlider.value = opacity;
            opacityValue.textContent = opacity + '%';
        }
    }

    // Opacity slider event listener
    opacitySlider.addEventListener('input', function(e) {
        const opacity = e.target.value / 100;
        opacityValue.textContent = e.target.value + '%';
        
        if (activePolygonIndex !== -1) {
            const currentColor = polygons[activePolygonIndex].color;
            const hex = rgbaToHex(currentColor);
            polygons[activePolygonIndex].color = hexToRgba(hex, opacity);
            redrawCanvas();
        }
    });

    floatingColorPicker.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (activePolygonIndex !== -1) {
                const currentOpacity = activePolygonIndex !== -1 ? 
                    getOpacityFromRgba(polygons[activePolygonIndex].color) : 
                    opacitySlider.value / 100;
                const newColor = hexToRgba(this.getAttribute('data-color'), currentOpacity);
                polygons[activePolygonIndex].color = newColor;
                polygons[activePolygonIndex].hexColor = this.getAttribute('data-color');
                // Store color info
                polygons[activePolygonIndex].colorInfo = {
                    number: this.getAttribute('data-number'),
                    name: this.getAttribute('data-name')
                };
                floatingColorPicker.style.display = 'none';
                activePolygonIndex = -1;
                redrawCanvas();
                updatePolygonList();
            }
        });
    });

    // Add click outside handler to close color picker
    document.addEventListener('click', function(e) {
        if (!document.getElementById('floatingColorPicker').contains(e.target) && 
            !canvas.contains(e.target)) {
            document.getElementById('floatingColorPicker').style.display = 'none';
            activePolygonIndex = -1;
            redrawCanvas();
        }
    });

    newPolygonBtn.addEventListener('click', function() {
        isDrawing = true;
        currentPoints = [];
        selectedPolygonIndex = -1;
        activePolygonIndex = -1;
        floatingColorPicker.style.display = 'none';
        redrawCanvas();
        updatePolygonList();
    });

    finishPolygonBtn.addEventListener('click', function() {
        if (currentPoints.length >= 3) {
            const wallNumber = polygons.length + 1;
            polygons.push({
                points: [...currentPoints],
                color: 'rgba(76, 175, 80, 0.2)',
                wallNumber: wallNumber,
                wallName: `Wall ${wallNumber}`,
                cutouts: []
            });
            currentPoints = [];
            isDrawing = false;
            updatePolygonList();
            redrawCanvas();
        }
    });

    clearButton.addEventListener('click', function() {
        polygons = [];
        currentPoints = [];
        selectedPolygonIndex = -1;
        activePolygonIndex = -1;
        floatingColorPicker.style.display = 'none';
        isDrawing = true;
        redrawCanvas();
        updatePolygonList();
    });

    function updatePolygonList() {
        polygonContainer.innerHTML = '';
        polygons.forEach((polygon, index) => {
            const div = document.createElement('div');
            div.className = 'polygon-item' + (index === selectedPolygonIndex ? ' selected' : '');
            
            const colorInfo = polygon.colorInfo || {};
            const pageInfo = colorInfo.pageNumber ? ` (Page ${colorInfo.pageNumber})` : '';
            
            // Store the original wall name or create default one
            if (!polygon.wallName) {
                polygon.wallName = `Wall ${index + 1}`;
            }
            
            div.innerHTML = `
                <div class="wall-name">${polygon.wallName}</div>
                <div class="wall-details">
                    ${colorInfo.number ? `#${colorInfo.number}${pageInfo}` : 'No color'}
                    <div class="wall-color" style="background-color: ${polygon.color}"></div>
                </div>
                <div class="color-info">
                    <div class="color-details">
                        <span class="color-name">${colorInfo.name || 'No name'}</span>
                    </div>
                </div>
                <div class="polygon-actions">
                    <button class="edit-name-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                </div>
            `;

            // Add event listeners for edit and delete buttons
            const editBtn = div.querySelector('.edit-name-btn');
            editBtn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent triggering polygon selection
                const wallNameElement = div.querySelector('.wall-name');
                const currentName = polygon.wallName; // Use stored wall name
                
                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentName;
                input.className = 'wall-name-input';
                
                wallNameElement.innerHTML = '';
                wallNameElement.appendChild(input);
                input.focus();
                
                function saveNewName() {
                    const newName = input.value.trim();
                    if (newName) {
                        polygon.wallName = newName; // Update the stored wall name
                        wallNameElement.textContent = newName;
                    } else {
                        wallNameElement.textContent = currentName;
                    }
                    input.removeEventListener('blur', saveNewName);
                    input.removeEventListener('keypress', handleEnter);
                }
                
                function handleEnter(e) {
                    if (e.key === 'Enter') {
                        saveNewName();
                    }
                }
                
                input.addEventListener('blur', saveNewName);
                input.addEventListener('keypress', handleEnter);
            });

            // Add delete button handler
            const deleteBtn = div.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                deletePolygon(index);
            });

            // Add click handler for selection
            div.addEventListener('click', function() {
                selectedPolygonIndex = index;
                activePolygonIndex = index;
                showColorPicker();
                redrawCanvas();
                updatePolygonList();
            });

            polygonContainer.appendChild(div);
        });
    }

    function doesLineIntersectPolygon(start, end, polygonPoints) {
        for (let i = 0; i < polygonPoints.length; i++) {
            const j = (i + 1) % polygonPoints.length;
            if (doLinesIntersect(
                start.x, start.y,
                end.x, end.y,
                polygonPoints[i].x, polygonPoints[i].y,
                polygonPoints[j].x, polygonPoints[j].y
            )) {
                return true;
            }
        }
        return false;
    }

    function doLinesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        const d1 = direction(x3, y3, x4, y4, x1, y1);
        const d2 = direction(x3, y3, x4, y4, x2, y2);
        const d3 = direction(x1, y1, x2, y2, x3, y3);
        const d4 = direction(x1, y1, x2, y2, x4, y4);

        if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
            ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
            return true;
        }

        if (d1 === 0 && isOnSegment(x3, y3, x4, y4, x1, y1)) return true;
        if (d2 === 0 && isOnSegment(x3, y3, x4, y4, x2, y2)) return true;
        if (d3 === 0 && isOnSegment(x1, y1, x2, y2, x3, y3)) return true;
        if (d4 === 0 && isOnSegment(x1, y1, x2, y2, x4, y4)) return true;

        return false;
    }

    function direction(x1, y1, x2, y2, x3, y3) {
        return (x3 - x1) * (y2 - y1) - (x2 - x1) * (y3 - y1);
    }

    function isOnSegment(x1, y1, x2, y2, x3, y3) {
        return x3 >= Math.min(x1, x2) && x3 <= Math.max(x1, x2) &&
               y3 >= Math.min(y1, y2) && y3 <= Math.max(y1, y2);
    }

    // Add delete polygon function to window scope
    window.deletePolygon = function(index) {
        polygons.splice(index, 1);
        selectedPolygonIndex = -1;
        activePolygonIndex = -1;
        floatingColorPicker.style.display = 'none';
        isDrawing = true;
        updatePolygonList();
        redrawCanvas();
    };

    // Image upload functionality
    imagePickerBtn.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                backgroundImage = new Image();
                backgroundImage.onload = () => {
                    redrawCanvas();
                };
                backgroundImage.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Save canvas functionality
    saveCanvasBtn.addEventListener('click', function() {
        // Create a temporary canvas with extra space for wall information
        const tempCanvas = document.createElement('canvas');
        const wallInfoWidth = 200; // Width for wall information panel
        tempCanvas.width = canvas.width + wallInfoWidth;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Fill white background
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw main canvas content
        if (backgroundImage) {
            const scale = Math.min(canvas.width / backgroundImage.width, canvas.height / backgroundImage.height);
            const x = (canvas.width - backgroundImage.width * scale) / 2;
            const y = (canvas.height - backgroundImage.height * scale) / 2;
            tempCtx.drawImage(backgroundImage, x, y, backgroundImage.width * scale, backgroundImage.height * scale);
        }

        // Draw all polygons
        polygons.forEach((polygon, index) => {
            tempCtx.beginPath();
            tempCtx.moveTo(polygon.points[0].x, polygon.points[0].y);
            polygon.points.forEach(point => {
                tempCtx.lineTo(point.x, point.y);
            });
            tempCtx.closePath();
            tempCtx.fillStyle = polygon.color;
            tempCtx.fill();
            tempCtx.strokeStyle = '#000';
            tempCtx.lineWidth = 1;
            tempCtx.stroke();
        });

        // Draw separator line
        tempCtx.beginPath();
        tempCtx.moveTo(canvas.width, 0);
        tempCtx.lineTo(canvas.width, canvas.height);
        tempCtx.strokeStyle = '#000';
        tempCtx.lineWidth = 1;
        tempCtx.stroke();

        // Draw wall information
        tempCtx.font = '12px Arial';
        tempCtx.fillStyle = '#000';
        tempCtx.fillText('Wall Information:', canvas.width + 10, 30);

        let yPos = 60;
        polygons.forEach((polygon, index) => {
            const colorInfo = polygon.colorInfo || {};
            const pageInfo = colorInfo.pageNumber ? `Page ${colorInfo.pageNumber}` : 'No page';
            const wallName = polygon.wallName || `Wall ${index + 1}`;
            
            // Draw wall info
            tempCtx.fillText(`${wallName}:`, canvas.width + 10, yPos);
            tempCtx.fillText(`Color: #${colorInfo.number || 'N/A'}`, canvas.width + 10, yPos + 15);
            tempCtx.fillText(`${colorInfo.name || 'No name'}`, canvas.width + 10, yPos + 30);
            tempCtx.fillText(`${pageInfo}`, canvas.width + 10, yPos + 45);
            
            // Draw color sample
            tempCtx.fillStyle = polygon.color;
            tempCtx.fillRect(canvas.width + 150, yPos, 20, 20);
            tempCtx.strokeStyle = '#000';
            tempCtx.strokeRect(canvas.width + 150, yPos, 20, 20);
            
            tempCtx.fillStyle = '#000';
            yPos += 65; // Increased spacing to accommodate the additional line
        });

        // Convert to image and trigger download
        try {
            const timestamp = new Date().toISOString().slice(0,19).replace(/[:]/g, '-');
            tempCanvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `walls_${timestamp}.png`;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 'image/png');
        } catch (error) {
            console.error('Error saving canvas:', error);
            alert('There was an error saving the image. Please try again.');
        }
    });

    // Initialize tabs and color cards when document is loaded
    initializeTabs();
    initializeColorCards();

    // Add toggle functionality for info section
    const toggleInfoBtn = document.querySelector('.toggle-info-btn');
    const controlsInfo = document.querySelector('.controls-info');

    toggleInfoBtn.addEventListener('click', function() {
        controlsInfo.classList.toggle('active');
        this.classList.toggle('active');
    });

    const cutoutBtn = document.getElementById('cutoutBtn');
    
    cutoutBtn.addEventListener('click', function() {
        if (activePolygonIndex !== -1) {
            isCutoutMode = !isCutoutMode;
            this.classList.toggle('active');
            
            if (isCutoutMode) {
                parentPolygonIndex = activePolygonIndex;
                cutoutPoints = [];
                cutoutCount = polygons[activePolygonIndex].cutouts ? 
                             polygons[activePolygonIndex].cutouts.length : 0;
                this.textContent = `Cancel Cutout (${cutoutCount} created)`;
                canvas.style.cursor = 'crosshair'; // Visual feedback for cutout mode
            } else {
                // Reset cutout mode
                parentPolygonIndex = -1;
                cutoutPoints = [];
                this.textContent = 'Create Cutout';
                canvas.style.cursor = 'default';
            }
            redrawCanvas();
        }
    });

    // Add this function to validate cutouts don't overlap
    function doCutoutsOverlap(existingCutouts, newCutout) {
        // Helper function to check if two rectangles overlap
        function doRectanglesOverlap(rect1Points, rect2Points) {
            // Get bounds of rectangles
            const rect1 = {
                left: Math.min(...rect1Points.map(p => p.x)),
                right: Math.max(...rect1Points.map(p => p.x)),
                top: Math.min(...rect1Points.map(p => p.y)),
                bottom: Math.max(...rect1Points.map(p => p.y))
            };
            const rect2 = {
                left: Math.min(...rect2Points.map(p => p.x)),
                right: Math.max(...rect2Points.map(p => p.x)),
                top: Math.min(...rect2Points.map(p => p.y)),
                bottom: Math.max(...rect2Points.map(p => p.y))
            };

            return !(rect1.right < rect2.left || 
                    rect1.left > rect2.right || 
                    rect1.bottom < rect2.top || 
                    rect1.top > rect2.bottom);
        }

        for (let existingCutout of existingCutouts) {
            if (doRectanglesOverlap(existingCutout, newCutout)) {
                return true;
            }
        }
        return false;
    }

    // Add function to edit wall name
    window.editWallName = function(index) {
        const newName = prompt('Enter new wall name:', polygons[index].wallName);
        if (newName !== null && newName.trim() !== '') {
            polygons[index].wallName = newName.trim();
            updatePolygonList();
            redrawCanvas();
        }
    };

    // Add roundRect method if not supported by browser
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
            if (width < 2 * radius) radius = width / 2;
            if (height < 2 * radius) radius = height / 2;
            this.beginPath();
            this.moveTo(x + radius, y);
            this.arcTo(x + width, y, x + width, y + height, radius);
            this.arcTo(x + width, y + height, x, y + height, radius);
            this.arcTo(x, y + height, x, y, radius);
            this.arcTo(x, y, x + width, y, radius);
            this.closePath();
            return this;
        };
    }

    // Modify the canvas click handler and add document click handler
    function handleCanvasClick(e) {
        const coords = getScaledCoordinates(e.clientX, e.clientY);
        const x = coords.x;
        const y = coords.y;

        if (isColorPickerActive) {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const pickedColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
            const closestColors = findClosestColors(pickedColor);
            updateMatchCards(closestColors);
            magnifier.style.display = 'none';
            return;
        }

        if (isCutoutMode && parentPolygonIndex !== -1) {
            if (isPointInPolygon(x, y, polygons[parentPolygonIndex].points)) {
                cutoutPoints.push({ x, y });
                redrawCanvas();
            }
        } else {
            let clickedPolygonIndex = -1;
            for (let i = polygons.length - 1; i >= 0; i--) {
                if (isPointInPolygon(x, y, polygons[i].points)) {
                    clickedPolygonIndex = i;
                    break;
                }
            }

            if (clickedPolygonIndex !== -1) {
                if (isDrawing) {
                    if (currentPoints.length >= 3) {
                        finishCurrentPolygon();
                    }
                    isDrawing = false;
                }
                activePolygonIndex = clickedPolygonIndex;
                selectedPolygonIndex = clickedPolygonIndex;
                showColorPicker();
            } else if (isDrawing) {
                currentPoints.push({ x, y });
            }
            redrawCanvas();
            updatePolygonList();
        }
    }

    // Add document click handler to handle clicks outside canvas
    document.addEventListener('click', function(e) {
        // Check if click is outside canvas and color picker
        if (!canvas.contains(e.target) && 
            !document.getElementById('floatingColorPicker').contains(e.target) &&
            !e.target.closest('.modal')) {
            
            // Reset cutout mode if active
            if (isCutoutMode) {
                isCutoutMode = false;
                parentPolygonIndex = -1;
                cutoutPoints = [];
                const cutoutBtn = document.getElementById('cutoutBtn');
                cutoutBtn.classList.remove('active');
                cutoutBtn.textContent = 'Create Cutout';
            }
            
            // Reset selection
            activePolygonIndex = -1;
            selectedPolygonIndex = -1;
            floatingColorPicker.style.display = 'none';
            redrawCanvas();
        }
    });

    // Add this function to handle cutout completion
    function completeCutout() {
        if (cutoutPoints.length >= 3) {
            if (!polygons[parentPolygonIndex].cutouts) {
                polygons[parentPolygonIndex].cutouts = [];
            }
            
            // Check if cutouts overlap
            if (!doCutoutsOverlap(polygons[parentPolygonIndex].cutouts, cutoutPoints)) {
                polygons[parentPolygonIndex].cutouts.push([...cutoutPoints]);
                cutoutCount = polygons[parentPolygonIndex].cutouts.length;
                document.getElementById('cutoutBtn').textContent = `Cancel Cutout (${cutoutCount} created)`;
            } else {
                alert('Cutouts cannot overlap!');
            }
        }
        cutoutPoints = [];
        redrawCanvas();
    }

    // Add double click handler to complete cutout
    canvas.addEventListener('dblclick', function(e) {
        if (isCutoutMode && cutoutPoints.length >= 3) {
            completeCutout();
        }
    });

    // Add key handler for Escape key to cancel cutout mode
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isCutoutMode) {
            isCutoutMode = false;
            parentPolygonIndex = -1;
            cutoutPoints = [];
            const cutoutBtn = document.getElementById('cutoutBtn');
            cutoutBtn.classList.remove('active');
            cutoutBtn.textContent = 'Create Cutout';
            canvas.style.cursor = 'default';
            redrawCanvas();
        }
    });

    // Function to calculate color difference (using Delta E algorithm)
    function calculateColorDifference(color1, color2) {
        // Convert hex to RGB
        const rgb1 = hexToRgb(color1);
        const rgb2 = hexToRgb(color2);
        
        // Simple color difference calculation
        return Math.sqrt(
            Math.pow(rgb1.r - rgb2.r, 2) +
            Math.pow(rgb1.g - rgb2.g, 2) +
            Math.pow(rgb1.b - rgb2.b, 2)
        );
    }

    // Function to convert hex to RGB
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // Function to convert RGB to hex
    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    // Function to find closest colors
    function findClosestColors(targetColor) {
        const allColors = [
            ...colorData.light,
            ...colorData.medium,
            ...colorData.dark
        ];
        
        return allColors
            .map(color => ({
                ...color,
                difference: calculateColorDifference(targetColor, color.value)
            }))
            .sort((a, b) => a.difference - b.difference)
            .slice(0, 5);
    }

    // Function to update match cards
    function updateMatchCards(colors = null) {
        for (let i = 1; i <= 5; i++) {
            const card = document.getElementById(`matchCard${i}`);
            if (colors && colors[i-1]) {
                // Show actual color data
                card.innerHTML = `
                    <div class="color-sample" style="background-color: ${colors[i-1].value}"></div>
                    <div class="color-info">
                        <div class="color-number">#${colors[i-1].number}</div>
                        <div class="color-name">${colors[i-1].name}</div>
                    </div>
                `;
            } else {
                // Show empty state
                card.innerHTML = `
                    <div class="color-sample empty"></div>
                    <div class="color-info">
                        <div class="color-number">--</div>
                        <div class="color-name">No color selected</div>
                    </div>
                `;
            }
        }
    }

    // Call updateMatchCards initially to show empty state
    updateMatchCards();

    // Add color picker button click handler
    document.getElementById('colorPickerBtn').addEventListener('click', function() {
        isColorPickerActive = !isColorPickerActive;
        this.classList.toggle('active');
        canvas.style.cursor = isColorPickerActive ? 'crosshair' : 'default';
        
        // Hide magnifier when deactivating color picker
        if (!isColorPickerActive) {
            magnifier.style.display = 'none';
        }
    });

    // Add canvas click handler for color picking
    canvas.addEventListener('click', function(e) {
        if (!isColorPickerActive) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Get pixel color
        const ctx = canvas.getContext('2d');
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const pickedColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
        
        // Find and display closest colors
        const closestColors = findClosestColors(pickedColor);
        updateMatchCards(closestColors);
        
        // Hide magnifier after picking
        magnifier.style.display = 'none';
    });

    // Add these after your existing canvas initialization
    const magnifier = document.createElement('div');
    magnifier.className = 'magnifier';
    document.body.appendChild(magnifier);

    const magnifierCanvas = document.createElement('canvas');
    magnifierCanvas.width = 200;  // Larger for better quality
    magnifierCanvas.height = 200;
    magnifier.appendChild(magnifierCanvas);
    const magCtx = magnifierCanvas.getContext('2d');

    // Add mousemove handler for magnifier
    canvas.addEventListener('mousemove', function(e) {
        if (!isColorPickerActive) return;
        
        const coords = getScaledCoordinates(e.clientX, e.clientY);
        const x = coords.x;
        const y = coords.y;
        
        // Show magnifier
        magnifier.style.display = 'block';
        magnifier.style.left = (e.clientX - 50) + 'px';
        magnifier.style.top = (e.clientY - 50) + 'px';
        
        // Draw magnified view
        magCtx.clearRect(0, 0, magnifierCanvas.width, magnifierCanvas.height);
        
        // Calculate the area to magnify
        const sourceX = Math.max(0, Math.min(x - 12, canvas.width - 25));
        const sourceY = Math.max(0, Math.min(y - 12, canvas.height - 25));
        
        // Draw magnified portion
        magCtx.drawImage(
            canvas,
            sourceX, sourceY, 25, 25,
            0, 0, magnifierCanvas.width, magnifierCanvas.height
        );
    });

    // Hide magnifier when mouse leaves canvas
    canvas.addEventListener('mouseleave', function() {
        magnifier.style.display = 'none';
    });

    // Update color picker click handler
    canvas.addEventListener('click', function(e) {
        if (!isColorPickerActive) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Get pixel color
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const pickedColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
        
        // Find and display closest colors
        const closestColors = findClosestColors(pickedColor);
        updateMatchCards(closestColors);
        
        // Hide magnifier after picking
        magnifier.style.display = 'none';
    });

    // Update the blend mode functions
    function lightenColor(baseColor, amount = 0.3) {
        const base = hexToRgb(baseColor);
        return rgbToHex(
            Math.min(255, Math.round(base.r + (255 - base.r) * amount)),
            Math.min(255, Math.round(base.g + (255 - base.g) * amount)),
            Math.min(255, Math.round(base.b + (255 - base.b) * amount))
        );
    }

    function darkenColor(baseColor, amount = 0.3) {
        const base = hexToRgb(baseColor);
        return rgbToHex(
            Math.max(0, Math.round(base.r * (1 - amount))),
            Math.max(0, Math.round(base.g * (1 - amount))),
            Math.max(0, Math.round(base.b * (1 - amount)))
        );
    }

    function multiplyColors(baseColor, backgroundColor) {
        const base = hexToRgb(baseColor);
        const background = hexToRgb(backgroundColor);
        
        return rgbToHex(
            Math.round((base.r * background.r) / 255),
            Math.round((base.g * background.g) / 255),
            Math.round((base.b * background.b) / 255)
        );
    }

    // Update the blend mode button handlers
    document.getElementById('lightenBtn').addEventListener('click', function() {
        if (activePolygonIndex === -1) return;
        
        const polygon = polygons[activePolygonIndex];
        
        if (activeBlendMode === 'lighten') {
            // Restore original color
            polygon.color = hexToRgba(originalColor, getOpacityFromRgba(polygon.color));
            polygon.hexColor = originalColor;
            activeBlendMode = null;
            originalColor = null;
            this.classList.remove('active');
        } else {
            // Store original color and apply lighten effect
            if (!originalColor) {
                originalColor = polygon.hexColor || rgbaToHex(polygon.color);
            }
            const lightened = lightenColor(originalColor);
            polygon.color = hexToRgba(lightened, getOpacityFromRgba(polygon.color));
            polygon.hexColor = lightened;
            activeBlendMode = 'lighten';
            
            // Deactivate other blend buttons
            document.getElementById('darkenBtn').classList.remove('active');
            document.getElementById('multiplyBtn').classList.remove('active');
            this.classList.add('active');
        }
        
        redrawCanvas();
        updatePolygonList();
    });

    document.getElementById('darkenBtn').addEventListener('click', function() {
        if (activePolygonIndex === -1) return;
        
        const polygon = polygons[activePolygonIndex];
        
        if (activeBlendMode === 'darken') {
            // Restore original color
            polygon.color = hexToRgba(originalColor, getOpacityFromRgba(polygon.color));
            polygon.hexColor = originalColor;
            activeBlendMode = null;
            originalColor = null;
            this.classList.remove('active');
        } else {
            // Store original color and apply darken effect
            if (!originalColor) {
                originalColor = polygon.hexColor || rgbaToHex(polygon.color);
            }
            const darkened = darkenColor(originalColor);
            polygon.color = hexToRgba(darkened, getOpacityFromRgba(polygon.color));
            polygon.hexColor = darkened;
            activeBlendMode = 'darken';
            
            // Deactivate other blend buttons
            document.getElementById('lightenBtn').classList.remove('active');
            document.getElementById('multiplyBtn').classList.remove('active');
            this.classList.add('active');
        }
        
        redrawCanvas();
        updatePolygonList();
    });

    document.getElementById('multiplyBtn').addEventListener('click', function() {
        if (activePolygonIndex === -1) return;
        
        const polygon = polygons[activePolygonIndex];
        
        if (activeBlendMode === 'multiply') {
            // Restore original color
            polygon.color = hexToRgba(originalColor, getOpacityFromRgba(polygon.color));
            polygon.hexColor = originalColor;
            activeBlendMode = null;
            originalColor = null;
            this.classList.remove('active');
        } else {
            // Store original color and apply multiply effect
            if (!originalColor) {
                originalColor = polygon.hexColor || rgbaToHex(polygon.color);
            }
            
            // Get the background color under the polygon
            const bounds = getPolygonBounds(polygon.points);
            const centerX = Math.round((bounds.minX + bounds.maxX) / 2);
            const centerY = Math.round((bounds.minY + bounds.maxY) / 2);
            
            // Get background pixel color
            const pixel = ctx.getImageData(centerX, centerY, 1, 1).data;
            const backgroundColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
            
            const multiplied = multiplyColors(originalColor, backgroundColor);
            polygon.color = hexToRgba(multiplied, getOpacityFromRgba(polygon.color));
            polygon.hexColor = multiplied;
            activeBlendMode = 'multiply';
            
            // Deactivate other blend buttons
            document.getElementById('lightenBtn').classList.remove('active');
            document.getElementById('darkenBtn').classList.remove('active');
            this.classList.add('active');
        }
        
        redrawCanvas();
        updatePolygonList();
    });

    // Add helper function to get average color under polygon
    function getAverageColorUnderPolygon(points) {
        const bounds = getPolygonBounds(points);
        const imageData = ctx.getImageData(bounds.minX, bounds.minY, 
            bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
        
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let x = bounds.minX; x < bounds.maxX; x++) {
            for (let y = bounds.minY; y < bounds.maxY; y++) {
                if (isPointInPolygon(x, y, points)) {
                    const i = ((y - bounds.minY) * (bounds.maxX - bounds.minX) + (x - bounds.minX)) * 4;
                    r += imageData.data[i];
                    g += imageData.data[i + 1];
                    b += imageData.data[i + 2];
                    count++;
                }
            }
        }
        
        return rgbToHex(
            Math.round(r / count),
            Math.round(g / count),
            Math.round(b / count)
        );
    }

    // Helper function to get polygon bounds
    function getPolygonBounds(points) {
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        return {
            minX: Math.floor(Math.min(...xs)),
            minY: Math.floor(Math.min(...ys)),
            maxX: Math.ceil(Math.max(...xs)),
            maxY: Math.ceil(Math.max(...ys))
        };
    }
});
