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
        // Get colors from colorData.js
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

                // Add drag events
                card.addEventListener('dragstart', function(e) {
                    e.dataTransfer.setData('text/plain', color.value);
                    activePolygonIndex = -1;
                });
                
                // Add click event listener
                card.addEventListener('click', function() {
                    if (activePolygonIndex !== -1) {
                        const currentOpacity = activePolygonIndex !== -1 ? 
                            getOpacityFromRgba(polygons[activePolygonIndex].color) : 
                            opacitySlider.value / 100;
                        polygons[activePolygonIndex].color = hexToRgba(this.getAttribute('data-color'), currentOpacity);
                        redrawCanvas();
                    }
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
    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const color = e.dataTransfer.getData('text/plain');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Find the polygon under the drop position
        const clickedPolygon = findPolygonAtPoint(x, y);
        if (clickedPolygon) {
            // Maintain the polygon's current opacity when applying new color
            const currentOpacity = getOpacityFromRgba(clickedPolygon.color);
            clickedPolygon.color = hexToRgba(color, currentOpacity);
            redrawCanvas();
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

    function drawPolygon(points, color, isSelected = false) {
        if (points.length < 3) return;
        
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = color.replace('rgba', 'rgb').replace(/,[^,]*\)/, ')');
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke();

        if (isSelected) {
            ctx.strokeStyle = '#2196F3';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
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
            drawPolygon(polygon.points, polygon.color, index === selectedPolygonIndex || isActive);
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
                drawPolygon(previewPoints, 'rgba(76, 175, 80, 0.2)');
            }
        }
    }

    // Event listeners
    canvas.addEventListener('click', function(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // First, check if clicked on existing polygon
        for (let i = polygons.length - 1; i >= 0; i--) {
            if (isPointInPolygon(x, y, polygons[i].points)) {
                if (isDrawing) {
                    // If we're drawing and trying to place a point inside an existing polygon, ignore it
                    return;
                } else {
                    // If we're not drawing, show color picker for the clicked polygon
                    activePolygonIndex = i;
                    showColorPicker(e.clientX, e.clientY);
                    redrawCanvas();
                    return;
                }
            }
        }

        // If we didn't click on any polygon and we're in drawing mode, add a point
        if (isDrawing) {
            // Check if the new line would intersect with any existing polygon
            if (currentPoints.length > 0) {
                const lastPoint = currentPoints[currentPoints.length - 1];
                for (let polygon of polygons) {
                    if (doesLineIntersectPolygon(lastPoint, {x, y}, polygon.points)) {
                        return; // Don't add the point if the line would intersect
                    }
                }
            }
            currentPoints.push({ x, y });
            redrawCanvas();
        }
    });

    function showColorPicker(x, y) {
        const rect = canvas.getBoundingClientRect();
        floatingColorPicker.style.left = (x + rect.left) + 'px';
        floatingColorPicker.style.top = (y + rect.top) + 'px';
        floatingColorPicker.style.display = 'block';
        
        if (activePolygonIndex !== -1) {
            const currentColor = polygons[activePolygonIndex].color;
            // Set the color input value
            floatingColorInput.value = rgbaToHex(currentColor);
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

    // Color picker event listeners
    floatingColorInput.addEventListener('input', function(e) {
        if (activePolygonIndex !== -1) {
            const currentOpacity = getOpacityFromRgba(polygons[activePolygonIndex].color);
            polygons[activePolygonIndex].color = hexToRgba(e.target.value, currentOpacity);
            redrawCanvas();
        }
    });

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
                polygons[activePolygonIndex].color = hexToRgba(this.getAttribute('data-color'), currentOpacity);
                floatingColorPicker.style.display = 'none';
                activePolygonIndex = -1;
                redrawCanvas();
            }
        });
    });

    // Add click outside handler to close color picker
    document.addEventListener('click', function(e) {
        if (!floatingColorPicker.contains(e.target) && !canvas.contains(e.target)) {
            floatingColorPicker.style.display = 'none';
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
            polygons.push({
                points: [...currentPoints],
                color: 'rgba(76, 175, 80, 0.2)'
            });
            currentPoints = [];
            isDrawing = false; // Set to false after finishing a polygon
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
            polygonItem.innerHTML = `
                <span>Wall ${index + 1} (${polygon.points.length} points)</span>
                <div>
                    <button onclick="deletePolygon(${index})" style="background-color: #f44336">Delete</button>
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
        // Create a temporary link element
        const link = document.createElement('a');
        // Get the canvas data as a URL
        const imageData = canvas.toDataURL('image/png');
        // Set the download attributes
        link.download = 'canvas-drawing.png';
        link.href = imageData;
        // Trigger the download
        link.click();
    });

    // Initialize tabs and color cards when document is loaded
    initializeTabs();
    initializeColorCards();
});
