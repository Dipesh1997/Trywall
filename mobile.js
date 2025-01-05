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
    let globalPageNumber = 1;
    let isColorPickerActive = false;
    const colorPickerPanel = document.getElementById('colorPickerPanel');
    let backgroundImage = null;
    
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
            loadColors(this.dataset.category);
        });
    });
    
    // Load colors
    function loadColors(category) {
        colorGrid.innerHTML = '';
        const colors = colorData[category] || [];
        
        if (category === 'opus') {
            // Create simple grid for opus colors without page numbers
            colors.forEach(color => {
                const card = createColorCard(color);
                colorGrid.appendChild(card);
            });
        } else {
            // Set fixed page ranges for each category
            let currentPage;
            if (category === 'light') {
                // Light colors: pages 1-25
                colors.forEach((color, i) => {
                    const card = createColorCard(color);
                    currentPage = Math.min(25, 1 + Math.floor(i / 8));
                    card.setAttribute('data-page', currentPage);
                    colorGrid.appendChild(card);
                    
                    // Add separator after every 8 colors
                    if ((i + 1) % 8 === 0 && currentPage <= 25) {
                        const separator = document.createElement('div');
                        separator.className = 'color-separator';
                        const circle = document.createElement('div');
                        circle.className = 'page-circle';
                        circle.textContent = currentPage;
                        separator.appendChild(circle);
                        colorGrid.appendChild(separator);
                    }
                });
            } else if (category === 'medium') {
                // Medium colors: pages 26-255
                colors.forEach((color, i) => {
                    const card = createColorCard(color);
                    currentPage = Math.min(255, 26 + Math.floor(i / 8));
                    card.setAttribute('data-page', currentPage);
                    colorGrid.appendChild(card);
                    
                    // Add separator after every 8 colors
                    if ((i + 1) % 8 === 0 && currentPage <= 255) {
                        const separator = document.createElement('div');
                        separator.className = 'color-separator';
                        const circle = document.createElement('div');
                        circle.className = 'page-circle';
                        circle.textContent = currentPage;
                        separator.appendChild(circle);
                        colorGrid.appendChild(separator);
                    }
                });
            } else if (category === 'dark') {
                // Dark colors: pages 256-275
                colors.forEach((color, i) => {
                    const card = createColorCard(color);
                    currentPage = Math.min(275, 256 + Math.floor(i / 8));
                    card.setAttribute('data-page', currentPage);
                    colorGrid.appendChild(card);
                    
                    // Add separator after every 8 colors
                    if ((i + 1) % 8 === 0 && currentPage <= 275) {
                        const separator = document.createElement('div');
                        separator.className = 'color-separator';
                        const circle = document.createElement('div');
                        circle.className = 'page-circle';
                        circle.textContent = currentPage;
                        separator.appendChild(circle);
                        colorGrid.appendChild(separator);
                    }
                });
            }
        }
    }
    
    // Create color card
    function createColorCard(color) {
        const card = document.createElement('div');
        card.className = 'color-card';
        card.style.setProperty('--color-value', color.value);
        
        const info = document.createElement('div');
        info.className = 'color-info';
        info.innerHTML = `
            <div class="color-number">#${color.number}</div>
            <div class="color-name">${color.name}</div>
        `;
        
        card.appendChild(info);
        
        // Add data attributes for search
        card.setAttribute('data-color', color.value);
        card.setAttribute('data-number', color.number);
        card.setAttribute('data-name', color.name);
        
        card.addEventListener('click', () => {
            if (selectedPolygonIndex !== -1) {
                polygons[selectedPolygonIndex].color = color.value;
                redrawCanvas();
                hideAllPanels();
                resetNavButtons();
                updateWallsList();
            }
        });
        
        // Add active state visual feedback
        card.addEventListener('touchstart', () => {
            card.style.transform = 'scale(0.98)';
        });
        
        card.addEventListener('touchend', () => {
            card.style.transform = 'scale(1)';
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
        
        // Draw background image if exists
        if (backgroundImage) {
            const scale = Math.min(
                canvas.width / backgroundImage.width,
                canvas.height / backgroundImage.height
            );
            
            const x = (canvas.width - backgroundImage.width * scale) / 2;
            const y = (canvas.height - backgroundImage.height * scale) / 2;
            
            ctx.drawImage(backgroundImage, x, y, 
                backgroundImage.width * scale, 
                backgroundImage.height * scale);
        }
        
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
            wallItem.className = 'wall-item' + (index === selectedPolygonIndex ? ' selected' : '');
            
            const colorInfo = polygon.colorInfo || {};
            const pageInfo = colorInfo.pageNumber ? ` (Page ${colorInfo.pageNumber})` : '';
            
            wallItem.innerHTML = `
                <div class="wall-color" style="background-color: ${polygon.color}"></div>
                <div class="wall-info">
                    <div class="wall-name">
                        <span class="name-text">${polygon.name || `Wall ${index + 1}`}</span>
                        <button class="edit-name-btn">✎</button>
                    </div>
                    <div class="wall-details">
                        ${colorInfo.number ? `#${colorInfo.number}${pageInfo}` : 'No color'}
                        <div class="color-name">${colorInfo.name || ''}</div>
                    </div>
                </div>
                <button class="delete-wall-btn">🗑️</button>
            `;
            
            // Add click handler for wall selection
            wallItem.addEventListener('click', (e) => {
                if (!e.target.closest('.edit-name-btn') && !e.target.closest('.delete-wall-btn')) {
                    selectedPolygonIndex = index;
                    redrawCanvas();
                    updateWallsList();
                }
            });
            
            // Add edit name functionality
            const editBtn = wallItem.querySelector('.edit-name-btn');
            editBtn.addEventListener('click', () => {
                const nameSpan = wallItem.querySelector('.name-text');
                const currentName = nameSpan.textContent;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentName;
                input.className = 'name-input';
                
                nameSpan.replaceWith(input);
                input.focus();
                
                input.addEventListener('blur', () => {
                    const newName = input.value.trim() || `Wall ${index + 1}`;
                    polygon.name = newName;
                    updateWallsList();
                });
                
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        input.blur();
                    }
                });
            });
            
            // Add delete functionality
            const deleteBtn = wallItem.querySelector('.delete-wall-btn');
            deleteBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this wall?')) {
                    polygons.splice(index, 1);
                    if (selectedPolygonIndex === index) {
                        selectedPolygonIndex = -1;
                    } else if (selectedPolygonIndex > index) {
                        selectedPolygonIndex--;
                    }
                    redrawCanvas();
                    updateWallsList();
                }
            });
            
            wallsList.appendChild(wallItem);
        });
    }
    
    // Update search functionality
    document.getElementById('colorSearch').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const categories = ['light', 'medium', 'dark', 'opus'];
        
        // Function to count visible cards in a container
        function countVisibleCards(container) {
            return Array.from(container.querySelectorAll('.color-card'))
                .filter(card => card.style.display !== 'none').length;
        }
        
        // Function to switch to tab
        function switchToTab(tabName) {
            document.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-category') === tabName) {
                    btn.classList.add('active');
                }
            });
            loadColors(tabName);
        }
        
        // Get current active tab
        const activeTab = document.querySelector('.category-btn.active').getAttribute('data-category');
        
        // Track visible cards for each category
        const visibleCounts = {};
        
        // Function to match color number with 4-digit pattern for opus
        function matchesNumberPattern(colorNumber, searchTerm) {
            // Remove spaces and get last 4 digits if exists
            const cleanNumber = colorNumber.replace(/\s+/g, '');
            const last4Digits = cleanNumber.slice(-4);
            const searchDigits = searchTerm.replace(/\s+/g, '');
            
            return last4Digits.includes(searchDigits) || cleanNumber.includes(searchDigits);
        }
        
        // Search in current tab first
        const cards = document.querySelectorAll('.color-card');
        let hasVisibleCards = false;
        
        cards.forEach(card => {
            const number = card.getAttribute('data-number').toLowerCase();
            const name = card.getAttribute('data-name').toLowerCase();
            const value = card.getAttribute('data-color').toLowerCase();
            
            let isVisible = false;
            if (activeTab === 'opus') {
                isVisible = number.includes(searchTerm) || 
                           name.includes(searchTerm) || 
                           value.includes(searchTerm) ||
                           matchesNumberPattern(number, searchTerm);
            } else {
                isVisible = number.includes(searchTerm) || 
                           name.includes(searchTerm) || 
                           value.includes(searchTerm);
            }
            
            card.style.display = isVisible ? '' : 'none';
            if (isVisible) hasVisibleCards = true;
        });
        
        // If no results in current tab, search other tabs
        if (!hasVisibleCards) {
            for (const category of categories) {
                if (category === activeTab) continue;
                
                const colors = colorData[category] || [];
                const hasMatch = colors.some(color => {
                    const number = color.number.toLowerCase();
                    const name = color.name.toLowerCase();
                    const value = color.value.toLowerCase();
                    
                    if (category === 'opus') {
                        return number.includes(searchTerm) || 
                               name.includes(searchTerm) || 
                               value.includes(searchTerm) ||
                               matchesNumberPattern(number, searchTerm);
                    }
                    
                    return number.includes(searchTerm) || 
                           name.includes(searchTerm) || 
                           value.includes(searchTerm);
                });
                
                if (hasMatch) {
                    switchToTab(category);
                    break;
                }
            }
        }
        
        // Update separators visibility for non-opus categories
        if (activeTab !== 'opus') {
            const separators = document.querySelectorAll('.color-separator');
            separators.forEach(sep => {
                const prevCard = sep.previousElementSibling;
                const nextCard = sep.nextElementSibling;
                sep.style.display = (prevCard && nextCard && 
                    prevCard.style.display !== 'none' && 
                    nextCard.style.display !== 'none') ? '' : 'none';
            });
        }
    });
    
    // Add color picker button handler
    document.getElementById('colorPickerBtn').addEventListener('click', function() {
        isColorPickerActive = !isColorPickerActive;
        this.classList.toggle('active');
        
        if (!isColorPickerActive) {
            colorPickerPanel.classList.remove('show');
        }
        
        canvas.style.cursor = isColorPickerActive ? 'crosshair' : 'default';
    });
    
    // Update canvas click handler
    canvas.addEventListener('click', function(e) {
        if (isColorPickerActive) {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            
            // Get pixel color
            const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
            const pickedColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
            
            // Find closest colors
            const matches = findClosestColors(pickedColor);
            updateMatchCards(matches);
            
            // Show color picker panel
            colorPickerPanel.classList.add('show');
            hideAllPanels();
        }
    });
    
    // Add these helper functions
    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
    
    function findClosestColors(targetColor) {
        const allColors = [
            ...colorData.light,
            ...colorData.medium,
            ...colorData.dark
        ];
        const opusColors = colorData.opus;
        
        return {
            regular: findNearestColors(targetColor, allColors, 5),
            opus: findNearestColors(targetColor, opusColors, 5)
        };
    }
    
    function findNearestColors(targetColor, colors, count) {
        const target = hexToRgb(targetColor);
        
        return colors
            .map(color => ({
                ...color,
                distance: getColorDistance(target, hexToRgb(color.value))
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, count);
    }
    
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    function getColorDistance(color1, color2) {
        return Math.sqrt(
            Math.pow(color2.r - color1.r, 2) +
            Math.pow(color2.g - color1.g, 2) +
            Math.pow(color2.b - color1.b, 2)
        );
    }
    
    function updateMatchCards(matches) {
        // Update regular matches
        matches.regular.forEach((color, i) => {
            const card = document.getElementById(`matchCard${i + 1}`);
            updateMatchCard(card, color);
        });
        
        // Update opus matches
        matches.opus.forEach((color, i) => {
            const card = document.getElementById(`opusMatchCard${i + 1}`);
            updateMatchCard(card, color);
        });
    }
    
    function updateMatchCard(card, color) {
        if (!color) {
            card.className = 'color-match-card empty';
            card.innerHTML = '';
            return;
        }
        
        card.className = 'color-match-card';
        card.innerHTML = `
            <div class="color-sample" style="background-color: ${color.value}"></div>
            <div class="color-info">
                <div class="color-number">#${color.number}</div>
                <div class="color-name">${color.name}</div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            if (selectedPolygonIndex !== -1) {
                polygons[selectedPolygonIndex].color = color.value;
                polygons[selectedPolygonIndex].colorInfo = {
                    number: color.number,
                    name: color.name
                };
                redrawCanvas();
                colorPickerPanel.classList.remove('show');
                isColorPickerActive = false;
                document.getElementById('colorPickerBtn').classList.remove('active');
                updateWallsList();
            }
        });
    }
    
    // Add these event listeners after other initialization code
    document.getElementById('uploadImageBtn').addEventListener('click', function() {
        document.getElementById('imageInput').click();
    });

    document.getElementById('imageInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    // Store background image
                    backgroundImage = img;
                    
                    // Scale image to fit canvas while maintaining aspect ratio
                    const scale = Math.min(
                        canvas.width / img.width,
                        canvas.height / img.height
                    );
                    
                    const x = (canvas.width - img.width * scale) / 2;
                    const y = (canvas.height - img.height * scale) / 2;
                    
                    // Clear canvas and draw image
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                    
                    // Redraw polygons
                    polygons.forEach((polygon, index) => {
                        drawPolygon(polygon.points, polygon.color, index === selectedPolygonIndex);
                        if (polygon.cutouts) {
                            polygon.cutouts.forEach(cutout => {
                                drawCutout(cutout);
                            });
                        }
                    });
                    
                    // Hide settings panel after upload
                    hideAllPanels();
                    resetNavButtons();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Initialize
    loadColors('light');
    
    // Add this after other button handlers
    document.getElementById('saveButton').addEventListener('click', function() {
        // Create a temporary canvas to draw background and polygons
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw background if exists
        if (backgroundImage) {
            const scale = Math.min(
                canvas.width / backgroundImage.width,
                canvas.height / backgroundImage.height
            );
            
            const x = (canvas.width - backgroundImage.width * scale) / 2;
            const y = (canvas.height - backgroundImage.height * scale) / 2;
            
            tempCtx.drawImage(backgroundImage, x, y, 
                backgroundImage.width * scale, 
                backgroundImage.height * scale);
        }
        
        // Draw all polygons
        polygons.forEach(polygon => {
            tempCtx.beginPath();
            tempCtx.moveTo(polygon.points[0].x, polygon.points[0].y);
            polygon.points.forEach(point => {
                tempCtx.lineTo(point.x, point.y);
            });
            tempCtx.closePath();
            tempCtx.fillStyle = polygon.color;
            tempCtx.fill();
            
            // Draw cutouts if any
            if (polygon.cutouts) {
                polygon.cutouts.forEach(cutout => {
                    tempCtx.beginPath();
                    tempCtx.moveTo(cutout[0].x, cutout[0].y);
                    cutout.forEach(point => {
                        tempCtx.lineTo(point.x, point.y);
                    });
                    tempCtx.closePath();
                    tempCtx.globalCompositeOperation = 'destination-out';
                    tempCtx.fill();
                    tempCtx.globalCompositeOperation = 'source-over';
                });
            }
        });
        
        // Create download link
        try {
            const dataUrl = tempCanvas.toDataURL('image/png');
            const link = document.createElement('a');
            const date = new Date();
            const timestamp = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}_${date.getHours().toString().padStart(2,'0')}${date.getMinutes().toString().padStart(2,'0')}`;
            link.download = `wall-design_${timestamp}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            alert('Failed to save image. Please try again.');
            console.error('Save failed:', err);
        }
    });
}); 