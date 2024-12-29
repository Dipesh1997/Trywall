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
        
        categories.forEach(category => {
            const container = document.getElementById(category + 'Colors');
            if (!container) {
                console.error(`Container ${category}Colors not found`);
                return;
            }
            
            const colors = colorData[category];
            if (!colors) {
                console.error(`No colors found for category ${category}`);
                return;
            }

            colors.forEach(color => {
                const card = document.createElement('div');
                card.className = 'color-card';
                card.style.backgroundColor = color.value;
                card.setAttribute('data-color', color.value);
                card.setAttribute('data-number', color.number);
                card.setAttribute('data-name', color.name);
                
                // Create number element
                const numberDiv = document.createElement('div');
                numberDiv.className = 'color-number';
                numberDiv.textContent = `#${color.number}`;
                
                // Create name element
                const nameDiv = document.createElement('div');
                nameDiv.className = 'color-name';
                nameDiv.textContent = color.name;
                
                card.appendChild(numberDiv);
                card.appendChild(nameDiv);
                card.draggable = true;

                // Modify the click event listener
                card.addEventListener('click', function() {
                    if (activePolygonIndex !== -1) {
                        const currentOpacity = getOpacityFromRgba(polygons[activePolygonIndex].color);
                        const newColor = hexToRgba(color.value, currentOpacity);
                        
                        // Update polygon with complete color information
                        polygons[activePolygonIndex].color = newColor;
                        polygons[activePolygonIndex].hexColor = color.value;
                        polygons[activePolygonIndex].colorInfo = {
                            number: color.number.trim(), // Ensure number is trimmed
                            name: color.name
                        };
                        
                        floatingColorPicker.style.display = 'none';
                        activePolygonIndex = -1;
                        redrawCanvas();
                        updatePolygonList();
                    }
                });

                // Also update the dragstart event
                card.addEventListener('dragstart', function(e) {
                    const colorData = {
                        value: color.value,
                        number: color.number.trim(),
                        name: color.name
                    };
                    e.dataTransfer.setData('application/json', JSON.stringify(colorData));
                    e.dataTransfer.effectAllowed = 'copy';
                });

                container.appendChild(card);
            });
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
            
            // Find the polygon under the drop position
            for (let i = polygons.length - 1; i >= 0; i--) {
                if (isPointInPolygon(x, y, polygons[i].points)) {
                    const currentOpacity = getOpacityFromRgba(polygons[i].color);
                    polygons[i].color = hexToRgba(colorData.value, currentOpacity);
                    polygons[i].hexColor = colorData.value;
                    polygons[i].colorInfo = {
                        number: colorData.number,
                        name: colorData.name
                    };
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
        const maxWidth = Math.min(800, window.innerWidth - 40);
        canvas.width = maxWidth;
        canvas.height = 500;
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
        const colorPicker = document.getElementById('floatingColorPicker');
        colorPicker.style.display = 'block';
        
        if (activePolygonIndex !== -1) {
            const currentColor = polygons[activePolygonIndex].color;
            // Set the opacity slider value
            const opacity = Math.round(getOpacityFromRgba(currentColor) * 100);
            opacitySlider.value = opacity;
            opacityValue.textContent = opacity + '%';
        } else {
            // Default values if no polygon is selected
            opacitySlider.value = 100;
            opacityValue.textContent = '100%';
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
            const polygonItem = document.createElement('div');
            polygonItem.className = 'polygon-item' + (index === selectedPolygonIndex ? ' selected-polygon' : '');
            
            const cutoutCount = polygon.cutouts ? polygon.cutouts.length : 0;
            const colorInfo = polygon.colorInfo ? 
                `<div class="color-info">
                    <div class="wall-color" style="background-color: ${polygon.hexColor || polygon.color}"></div>
                    <div class="color-details">
                        <span class="color-number">#${polygon.colorInfo.number}</span>
                        <span class="color-name">${polygon.colorInfo.name}</span>
                    </div>
                </div>` : '';

            polygonItem.innerHTML = `
                <div class="polygon-info">
                    <div class="wall-number">#${polygon.wallNumber}</div>
                    <div class="wall-name">${polygon.wallName}</div>
                    <div class="wall-details">
                        Points: ${polygon.points.length}
                        ${cutoutCount > 0 ? `| Cutouts: ${cutoutCount}` : ''}
                    </div>
                    ${colorInfo}
                </div>
                <div class="polygon-actions">
                    <button class="edit-name-btn" onclick="editWallName(${index})">✏️</button>
                    <button class="delete-btn" onclick="deletePolygon(${index})">🗑️</button>
                </div>
            `;
            polygonContainer.appendChild(polygonItem);
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
        // First, create a temporary canvas for the complete image
        const tempCanvas = document.createElement('canvas');
        const tableHeight = 100 + (polygons.length * 30);
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height + tableHeight;
        const tempCtx = tempCanvas.getContext('2d');

        // Fill background
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Copy the main canvas content to the temporary canvas
        tempCtx.drawImage(canvas, 0, 0);

        // Draw the table below the canvas content
        const startY = canvas.height + 20;
        tempCtx.textAlign = 'left';
        tempCtx.fillStyle = '#333';
        tempCtx.font = '14px Arial';
        
        // Draw table header
        tempCtx.fillStyle = '#f5f5f5';
        tempCtx.fillRect(20, startY, tempCanvas.width - 40, 30);
        tempCtx.fillStyle = '#333';
        tempCtx.fillText('Wall #', 30, startY + 20);
        tempCtx.fillText('Name', 100, startY + 20);
        tempCtx.fillText('Points', 250, startY + 20);
        tempCtx.fillText('Cutouts', 300, startY + 20);
        tempCtx.fillText('Color', 400, startY + 20);
        tempCtx.fillText('Color Info', 500, startY + 20);

        // Draw table rows
        polygons.forEach((polygon, index) => {
            const rowY = startY + 30 + (index * 30);
            
            if (index % 2 === 0) {
                tempCtx.fillStyle = '#ffffff';
            } else {
                tempCtx.fillStyle = '#f9f9f9';
            }
            tempCtx.fillRect(20, rowY, tempCanvas.width - 40, 30);
            
            tempCtx.fillStyle = '#333';
            tempCtx.fillText(`#${polygon.wallNumber}`, 30, rowY + 20);
            tempCtx.fillText(polygon.wallName, 100, rowY + 20);
            tempCtx.fillText(polygon.points.length.toString(), 250, rowY + 20);
            tempCtx.fillText((polygon.cutouts ? polygon.cutouts.length : 0).toString(), 300, rowY + 20);
            
            // Draw color sample
            const colorSample = polygon.hexColor || '#ffffff';
            tempCtx.fillStyle = colorSample;
            tempCtx.fillRect(400, rowY + 5, 20, 20);

            // Draw color info
            if (polygon.colorInfo) {
                tempCtx.fillStyle = '#333';
                const colorInfoText = `#${polygon.colorInfo.number} - ${polygon.colorInfo.name}`;
                tempCtx.fillText(colorInfoText, 500, rowY + 20);
            }
        });

        const link = document.createElement('a');
        link.download = 'wall-drawing.png';
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
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
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (isCutoutMode && parentPolygonIndex !== -1) {
            // Check if click is inside the parent polygon
            if (isPointInPolygon(x, y, polygons[parentPolygonIndex].points)) {
                cutoutPoints.push({ x, y });
                redrawCanvas();
            }
        } else {
            // Normal polygon selection/drawing logic
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
});
