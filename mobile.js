document.addEventListener('DOMContentLoaded', function() {
    // Canvas setup
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    
    // State variables
    let currentPoints = [];
    let polygons = [];
    let isDrawing = false;
    let selectedPolygonIndex = -1;
    let isCutoutMode = false;
    let cutoutPoints = [];
    let activeCategory = 'light';
    let isDragging = false;
    let lastPoint = null;
    
    // Panel elements
    const colorPanel = document.getElementById('colorPanel');
    const wallsPanel = document.getElementById('wallsPanel');
    const settingsPanel = document.getElementById('settingsPanel');
    const wallActionMenu = document.getElementById('wallActionMenu');
    const colorGrid = document.querySelector('.color-grid');
    
    // Set canvas size
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        redrawCanvas();
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Navigation buttons
    document.getElementById('colorsBtn').addEventListener('click', function() {
        hideAllPanels();
        colorPanel.classList.add('show');
        setActiveNavButton(this);
    });
    
    document.getElementById('wallsBtn').addEventListener('click', function() {
        hideAllPanels();
        wallsPanel.classList.add('show');
        setActiveNavButton(this);
        updateWallsList();
    });
    
    document.getElementById('settingsBtn').addEventListener('click', function() {
        hideAllPanels();
        settingsPanel.classList.add('show');
        setActiveNavButton(this);
    });
    
    // Floating action button
    document.getElementById('wallActionBtn').addEventListener('click', function() {
        wallActionMenu.classList.toggle('show');
    });
    
    // Close panels
    document.querySelectorAll('.close-panel').forEach(btn => {
        btn.addEventListener('click', function() {
            hideAllPanels();
            resetNavButtons();
        });
    });
    
    function hideAllPanels() {
        colorPanel.classList.remove('show');
        wallsPanel.classList.remove('show');
        settingsPanel.classList.remove('show');
        wallActionMenu.classList.remove('show');
    }
    
    function setActiveNavButton(button) {
        resetNavButtons();
        button.classList.add('active');
    }
    
    function resetNavButtons() {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    }
    
    // Category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            activeCategory = this.dataset.category;
            loadColors(activeCategory);
        });
    });
    
    // Load colors
    function loadColors(category) {
        colorGrid.innerHTML = '';
        const colors = colorData[category] || [];
        
        colors.forEach(color => {
            const card = createColorCard(color);
            colorGrid.appendChild(card);
        });
    }
    
    // Create color card
    function createColorCard(color) {
        const card = document.createElement('div');
        card.className = 'color-card';
        
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color.value;
        
        const info = document.createElement('div');
        info.className = 'color-info';
        info.innerHTML = `
            <div class="color-number">#${color.number}</div>
            <div class="color-name">${color.name}</div>
        `;
        
        card.appendChild(swatch);
        card.appendChild(info);
        
        card.addEventListener('click', () => {
            if (selectedPolygonIndex !== -1) {
                polygons[selectedPolygonIndex].color = color.value;
                redrawCanvas();
                hideAllPanels();
                resetNavButtons();
                updateWallsList();
            }
        });
        
        return card;
    }
    
    // Canvas event handlers
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('touchstart', handleStart);
    canvas.addEventListener('touchmove', handleMove);
    canvas.addEventListener('touchend', handleEnd);
    
    function handleStart(e) {
        e.preventDefault();
        isDragging = true;
        const point = getEventPoint(e);
        lastPoint = point;
        
        if (isDrawing) {
            currentPoints.push(point);
        } else if (isCutoutMode && selectedPolygonIndex !== -1) {
            cutoutPoints.push(point);
        } else {
            // Check for polygon selection
            for (let i = polygons.length - 1; i >= 0; i--) {
                if (isPointInPolygon(point.x, point.y, polygons[i].points)) {
                    selectedPolygonIndex = i;
                    colorPanel.classList.add('show');
                    setActiveNavButton(document.getElementById('colorsBtn'));
                    break;
                }
            }
        }
        redrawCanvas();
    }
    
    function handleMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        const point = getEventPoint(e);
        
        if (isDrawing || (isCutoutMode && selectedPolygonIndex !== -1)) {
            // Only add point if it's far enough from the last point
            if (getDistance(lastPoint, point) > 5) {
                if (isDrawing) {
                    currentPoints.push(point);
                } else {
                    cutoutPoints.push(point);
                }
                lastPoint = point;
                redrawCanvas();
            }
        }
    }
    
    function handleEnd(e) {
        isDragging = false;
        lastPoint = null;
    }
    
    function getEventPoint(e) {
        const rect = canvas.getBoundingClientRect();
        const point = e.touches ? e.touches[0] : e;
        return {
            x: (point.clientX - rect.left) * (canvas.width / rect.width),
            y: (point.clientY - rect.top) * (canvas.height / rect.height)
        };
    }
    
    function getDistance(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }
    
    // Tool buttons
    document.getElementById('newWallBtn').addEventListener('click', function() {
        isDrawing = true;
        isCutoutMode = false;
        currentPoints = [];
        selectedPolygonIndex = -1;
        canvas.style.cursor = 'crosshair';
        hideAllPanels();
        resetNavButtons();
    });
    
    document.getElementById('finishWallBtn').addEventListener('click', function() {
        if (currentPoints.length >= 3) {
            polygons.push({
                points: [...currentPoints],
                color: '#cccccc',
                cutouts: []
            });
            currentPoints = [];
            isDrawing = false;
            canvas.style.cursor = 'default';
            updateWallsList();
        }
        hideAllPanels();
        resetNavButtons();
        redrawCanvas();
    });
    
    document.getElementById('cutoutBtn').addEventListener('click', function() {
        if (selectedPolygonIndex !== -1) {
            isCutoutMode = !isCutoutMode;
            isDrawing = false;
            cutoutPoints = [];
            canvas.style.cursor = isCutoutMode ? 'crosshair' : 'default';
            if (!isCutoutMode && cutoutPoints.length >= 3) {
                polygons[selectedPolygonIndex].cutouts = 
                    polygons[selectedPolygonIndex].cutouts || [];
                polygons[selectedPolygonIndex].cutouts.push([...cutoutPoints]);
                cutoutPoints = [];
            }
        }
        hideAllPanels();
        resetNavButtons();
        redrawCanvas();
    });
    
    // Drawing functions
    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw polygons
        polygons.forEach((polygon, index) => {
            drawPolygon(polygon.points, polygon.color, index === selectedPolygonIndex);
            
            // Draw cutouts
            if (polygon.cutouts) {
                polygon.cutouts.forEach(cutout => {
                    drawCutout(cutout);
                });
            }
        });
        
        // Draw current points
        if (currentPoints.length > 0) {
            drawPoints(currentPoints, '#000');
        }
        
        // Draw cutout preview
        if (isCutoutMode && cutoutPoints.length > 0) {
            drawPoints(cutoutPoints, '#f00');
        }
    }
    
    function drawPolygon(points, color, isSelected) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach(point => {
            ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        if (isSelected) {
            ctx.strokeStyle = '#2196F3';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    function drawPoints(points, color) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach(point => {
            ctx.lineTo(point.x, point.y);
        });
        if (points.length >= 3) {
            ctx.closePath();
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    function drawCutout(points) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach(point => {
            ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }
    
    function isPointInPolygon(x, y, points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
    
    // Update walls list
    function updateWallsList() {
        const wallsList = document.getElementById('polygonContainer');
        wallsList.innerHTML = '';
        
        polygons.forEach((polygon, index) => {
            const wallItem = document.createElement('div');
            wallItem.className = 'wall-item';
            wallItem.innerHTML = `
                <div class="wall-color" style="background-color: ${polygon.color}"></div>
                <div class="wall-info">
                    <div class="wall-title">Wall ${index + 1}</div>
                    <div class="wall-subtitle">${polygon.cutouts ? polygon.cutouts.length : 0} cutouts</div>
                </div>
            `;
            
            wallItem.addEventListener('click', () => {
                selectedPolygonIndex = index;
                redrawCanvas();
                colorPanel.classList.add('show');
                setActiveNavButton(document.getElementById('colorsBtn'));
            });
            
            wallsList.appendChild(wallItem);
        });
    }
    
    // Initialize
    loadColors('light');
}); 