document.addEventListener('DOMContentLoaded', function() {
    // Canvas setup
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match screen
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        redrawCanvas();
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // State variables
    let currentPoints = [];
    let polygons = [];
    let isDrawing = false;
    let selectedPolygonIndex = -1;
    let isCutoutMode = false;
    let cutoutPoints = [];
    let activeCategory = 'light';
    
    // Panel elements
    const colorPanel = document.getElementById('colorPanel');
    const toolsPanel = document.getElementById('toolsPanel');
    const colorGrid = document.querySelector('.color-grid');
    
    // Navigation buttons
    document.getElementById('colorsBtn').addEventListener('click', function() {
        colorPanel.classList.add('panel-open');
        this.classList.add('active');
    });
    
    document.getElementById('toolsBtn').addEventListener('click', function() {
        toolsPanel.classList.add('panel-open');
        this.classList.add('active');
    });
    
    // Close panel buttons
    document.querySelectorAll('.close-panel').forEach(btn => {
        btn.addEventListener('click', function() {
            const panel = this.closest('.color-panel, .tools-panel');
            panel.classList.remove('panel-open');
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        });
    });
    
    // Category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            activeCategory = this.dataset.category;
            loadColors(activeCategory);
        });
    });
    
    // Load colors for a category
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
        
        // Add tap handler for color selection
        card.addEventListener('click', () => {
            if (selectedPolygonIndex !== -1) {
                polygons[selectedPolygonIndex].color = color.value;
                redrawCanvas();
                colorPanel.classList.remove('panel-open');
                document.getElementById('colorsBtn').classList.remove('active');
            }
        });
        
        return card;
    }
    
    // Add mouse event listeners alongside touch events
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('touchstart', handleStart);
    canvas.addEventListener('touchmove', handleMove);
    canvas.addEventListener('touchend', handleEnd);
    
    // Combined handler for mouse/touch start
    function handleStart(e) {
        e.preventDefault();
        const point = getEventPoint(e);
        
        if (isDrawing) {
            currentPoints.push(point);
            redrawCanvas();
        } else if (isCutoutMode && selectedPolygonIndex !== -1) {
            cutoutPoints.push(point);
            redrawCanvas();
        } else {
            // Check if clicked/touched a polygon
            for (let i = polygons.length - 1; i >= 0; i--) {
                if (isPointInPolygon(point.x, point.y, polygons[i].points)) {
                    selectedPolygonIndex = i;
                    redrawCanvas();
                    // Show color panel when selecting a polygon
                    colorPanel.classList.add('panel-open');
                    document.getElementById('colorsBtn').classList.add('active');
                    break;
                }
            }
        }
    }
    
    // Combined handler for mouse/touch move
    function handleMove(e) {
        if (!isDrawing && !isCutoutMode) return;
        e.preventDefault();
        const point = getEventPoint(e);
        
        if (isDrawing) {
            currentPoints.push(point);
        } else if (isCutoutMode && selectedPolygonIndex !== -1) {
            cutoutPoints.push(point);
        }
        redrawCanvas();
    }
    
    // Combined handler for mouse/touch end
    function handleEnd(e) {
        if (isCutoutMode && cutoutPoints.length >= 3) {
            polygons[selectedPolygonIndex].cutouts = polygons[selectedPolygonIndex].cutouts || [];
            polygons[selectedPolygonIndex].cutouts.push([...cutoutPoints]);
            cutoutPoints = [];
            isCutoutMode = false;
            document.getElementById('cutoutBtn').classList.remove('active');
        }
        redrawCanvas();
    }
    
    // Helper function to get coordinates from either mouse or touch event
    function getEventPoint(e) {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    }
    
    // Update tool buttons to be more explicit about modes
    document.getElementById('newWallBtn').addEventListener('click', function() {
        isDrawing = true;
        isCutoutMode = false;
        currentPoints = [];
        selectedPolygonIndex = -1;
        document.getElementById('cutoutBtn').classList.remove('active');
        toolsPanel.classList.remove('panel-open');
        document.getElementById('toolsBtn').classList.remove('active');
        canvas.style.cursor = 'crosshair';
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
            redrawCanvas();
        }
        toolsPanel.classList.remove('panel-open');
        document.getElementById('toolsBtn').classList.remove('active');
    });
    
    document.getElementById('cutoutBtn').addEventListener('click', function() {
        if (selectedPolygonIndex !== -1) {
            isCutoutMode = !isCutoutMode;
            isDrawing = false;
            this.classList.toggle('active');
            cutoutPoints = [];
            canvas.style.cursor = isCutoutMode ? 'crosshair' : 'default';
        }
        toolsPanel.classList.remove('panel-open');
        document.getElementById('toolsBtn').classList.remove('active');
    });
    
    // Add clear button functionality
    document.getElementById('clearBtn').addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all walls?')) {
            polygons = [];
            currentPoints = [];
            cutoutPoints = [];
            isDrawing = false;
            isCutoutMode = false;
            selectedPolygonIndex = -1;
            redrawCanvas();
        }
        toolsPanel.classList.remove('panel-open');
        document.getElementById('toolsBtn').classList.remove('active');
    });
    
    // Add save button functionality
    document.getElementById('saveBtn').addEventListener('click', function() {
        const link = document.createElement('a');
        link.download = 'wall-design.png';
        link.href = canvas.toDataURL();
        link.click();
        toolsPanel.classList.remove('panel-open');
        document.getElementById('toolsBtn').classList.remove('active');
    });
    
    // Update redrawCanvas to show cutout preview
    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw all polygons
        polygons.forEach((polygon, index) => {
            drawPolygon(polygon.points, polygon.color, index === selectedPolygonIndex, polygon.cutouts);
        });
        
        // Draw current points for new wall
        if (currentPoints.length > 0) {
            drawPoints(currentPoints, '#000');
        }
        
        // Draw cutout preview
        if (isCutoutMode && cutoutPoints.length > 0) {
            drawPoints(cutoutPoints, '#f00');
        }
    }
    
    // Helper function to draw points
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
        ctx.stroke();
    }
    
    // Initialize with light colors
    loadColors('light');
}); 