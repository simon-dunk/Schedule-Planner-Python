// Global data storage
let scheduleData = {
    classes: {},
    work: {}
};

let idCounter = 1;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    generateTimeSlots();
    updateSummaryStats();
});

// Generate time slots for the schedule table
function generateTimeSlots() {
    const scheduleBody = document.getElementById('scheduleBody');
    const startHour = 6;
    const endHour = 22;
    
    for (let hour = startHour; hour <= endHour; hour++) {
        const row = document.createElement('tr');
        
        // Time cell
        const timeCell = document.createElement('td');
        timeCell.className = 'time-cell';
        timeCell.textContent = formatHour(hour);
        row.appendChild(timeCell);
        
        // Day cells
        for (let day = 0; day < 7; day++) {
            const dayCell = document.createElement('td');
            dayCell.className = 'schedule-cell';
            dayCell.dataset.hour = hour;
            dayCell.dataset.day = day;
            row.appendChild(dayCell);
        }
        
        scheduleBody.appendChild(row);
    }
}

// Format hour for display
function formatHour(hour) {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
}

// Add a new class
function addClass() {
    const name = document.getElementById('className').value.trim();
    const instructor = document.getElementById('classInstructor').value.trim();
    const days = document.getElementById('classDays').value.trim();
    const time = document.getElementById('classTime').value.trim();
    
    if (!name || !days || !time) {
        alert('Please fill in at least Class Name, Days, and Time');
        return;
    }
    
    if (!isValidTimeFormat(time)) {
        alert('Please enter a valid time range (e.g., 9:00-10:30)');
        return;
    }
    
    const parsedDays = parseDays(days);
    if (parsedDays.length === 0) {
        alert('Please enter valid days (e.g., Mon,Wed,Fri or MWF)');
        return;
    }
    
    const classId = `class_${idCounter++}`;
    scheduleData.classes[classId] = {
        id: classId,
        name: name,
        instructor: instructor,
        days: parsedDays,
        time: time,
        type: 'class'
    };
    
    visualizeScheduleItem(classId, 'class');
    updateClassesList();
    updateSummaryStats();
    clearClassForm();
}

// Add a new work session
function addWork() {
    const day = document.getElementById('workDay').value;
    const time = document.getElementById('workTime').value.trim();
    const location = document.getElementById('workLocation').value.trim();
    
    if (!day || !time || !location) {
        alert('Please fill in all work fields');
        return;
    }
    
    if (!isValidTimeFormat(time)) {
        alert('Please enter a valid time range (e.g., 9:00-17:00)');
        return;
    }
    
    const workId = `work_${idCounter++}`;
    scheduleData.work[workId] = {
        id: workId,
        day: day,
        days: [getDayIndex(day)],
        time: time,
        location: location,
        type: 'work'
    };
    
    visualizeScheduleItem(workId, 'work');
    updateWorkList();
    updateSummaryStats();
    clearWorkForm();
}

// Parse Excel data
function parseExcelData() {
    const data = document.getElementById('pasteData').value.trim();
    if (!data) {
        alert('Please paste some data first');
        return;
    }
    
    const lines = data.split('\n');
    let addedCount = 0;
    
    lines.forEach(line => {
        const parts = line.split('\t');
        if (parts.length >= 4) {
            const name = parts[0].trim();
            const instructor = parts[1].trim();
            const days = parts[2].trim();
            const time = parts[3].trim();
            
            if (name && days && time && isValidTimeFormat(time)) {
                const parsedDays = parseDays(days);
                if (parsedDays.length > 0) {
                    const classId = `class_${idCounter++}`;
                    scheduleData.classes[classId] = {
                        id: classId,
                        name: name,
                        instructor: instructor,
                        days: parsedDays,
                        time: time,
                        type: 'class'
                    };
                    
                    visualizeScheduleItem(classId, 'class');
                    addedCount++;
                }
            }
        }
    });
    
    if (addedCount > 0) {
        updateClassesList();
        updateSummaryStats();
        document.getElementById('pasteData').value = '';
        alert(`Successfully added ${addedCount} classes`);
    } else {
        alert('No valid data found. Please check the format.');
    }
}

// Visualize schedule item on the calendar
function visualizeScheduleItem(itemId, type) {
    const item = type === 'class' ? scheduleData.classes[itemId] : scheduleData.work[itemId];
    const timeRange = parseTimeRange(item.time);
    
    if (!timeRange) return;
    
    const startHour = Math.floor(timeRange.startMinutes / 60);
    const startMinute = timeRange.startMinutes % 60;
    const endHour = Math.floor(timeRange.endMinutes / 60);
    const endMinute = timeRange.endMinutes % 60;
    const totalDurationMinutes = timeRange.endMinutes - timeRange.startMinutes;
    
    // Calculate how many full hours this spans
    const hoursSpanned = Math.ceil((timeRange.endMinutes - timeRange.startMinutes) / 60);
    
    item.days.forEach(dayIndex => {
        // Create the main bubble in the starting hour
        const startCell = document.querySelector(`[data-hour="${startHour}"][data-day="${dayIndex}"]`);
        if (startCell) {
            const bubble = createScheduleBubble(item, type, totalDurationMinutes, startMinute, endMinute, hoursSpanned);
            startCell.appendChild(bubble);
        }
    });
}

// Create a schedule bubble element with full duration
function createScheduleBubble(item, type, totalDurationMinutes, startMinute, endMinute, hoursSpanned) {
    const bubble = document.createElement('div');
    bubble.className = `schedule-bubble ${type}-bubble`;
    bubble.dataset.itemId = item.id;
    bubble.dataset.type = type;
    
    // Calculate the total height needed
    const hourHeight = 60; // Each hour cell is 60px
    const pixelsPerMinute = hourHeight / 60;
    
    // Calculate exact height based on duration
    let bubbleHeight = totalDurationMinutes * pixelsPerMinute;
    
    // Set the height and position
    bubble.style.height = `${bubbleHeight}px`;
    bubble.style.marginTop = `${startMinute * pixelsPerMinute}px`;
    
    // Add class for multi-hour events for better styling
    if (hoursSpanned > 1) {
        bubble.classList.add('multi-hour');
    }
    
    const title = type === 'class' ? item.name : 'WORK';
    const subtitle = type === 'class' ? item.instructor : item.location;
    const details = item.time;
    
    let bubbleContent = `
        <div class="bubble-title">${title}</div>
        <div class="bubble-details">${subtitle || ''}</div>
        <div class="bubble-details">${details}</div>
    `;
    
    bubbleContent += `<button class="bubble-delete" onclick="deleteScheduleItem('${item.id}', '${type}')" title="Delete">×</button>`;
    
    bubble.innerHTML = bubbleContent;
    
    return bubble;
}

// Delete a schedule item
function deleteScheduleItem(itemId, type) {
    if (confirm('Are you sure you want to delete this item?')) {
        // Remove from data
        if (type === 'class') {
            delete scheduleData.classes[itemId];
        } else {
            delete scheduleData.work[itemId];
        }
        
        // Remove bubbles from schedule
        const bubbles = document.querySelectorAll(`[data-item-id="${itemId}"]`);
        bubbles.forEach(bubble => bubble.remove());
        
        // Update lists and stats
        updateClassesList();
        updateWorkList();
        updateSummaryStats();
    }
}

// Update the classes list
function updateClassesList() {
    const classesList = document.getElementById('classesList');
    const classes = Object.values(scheduleData.classes);
    
    if (classes.length === 0) {
        classesList.innerHTML = '<p class="empty-message">No classes added yet</p>';
        return;
    }
    
    classesList.innerHTML = '';
    classes.forEach(classItem => {
        const card = document.createElement('div');
        card.className = 'item-card';
        
        const daysText = classItem.days.map(dayIndex => getDayName(dayIndex)).join(', ');
        
        card.innerHTML = `
            <div class="item-header">
                <div class="item-title">${classItem.name}</div>
                <button class="btn btn-danger" onclick="deleteScheduleItem('${classItem.id}', 'class')">Delete</button>
            </div>
            <div class="item-details">
                ${classItem.instructor ? `<div><strong>Instructor:</strong> ${classItem.instructor}</div>` : ''}
                <div><strong>Days:</strong> ${daysText}</div>
                <div><strong>Time:</strong> ${classItem.time}</div>
                <span class="item-tag class-tag">Class</span>
            </div>
        `;
        
        classesList.appendChild(card);
    });
}

// Update the work list with hours calculation
function updateWorkList() {
    const workList = document.getElementById('workList');
    const workItems = Object.values(scheduleData.work);
    
    if (workItems.length === 0) {
        workList.innerHTML = '<p class="empty-message">No work sessions added yet</p>';
        return;
    }
    
    workList.innerHTML = '';
    workItems.forEach(workItem => {
        const card = document.createElement('div');
        card.className = 'item-card';
        
        // Calculate hours for this work session
        const timeRange = parseTimeRange(workItem.time);
        const hours = timeRange ? Math.round(((timeRange.endMinutes - timeRange.startMinutes) / 60) * 10) / 10 : 0;
        
        card.innerHTML = `
            <div class="item-header">
                <div class="item-title">${workItem.day.charAt(0).toUpperCase() + workItem.day.slice(1)} Work</div>
                <button class="btn btn-danger" onclick="deleteScheduleItem('${workItem.id}', 'work')">Delete</button>
            </div>
            <div class="item-details">
                <div><strong>Time:</strong> ${workItem.time} <span class="hours-badge">${hours}h</span></div>
                <div><strong>Location:</strong> ${workItem.location}</div>
                <span class="item-tag work-tag">Work</span>
            </div>
        `;
        
        workList.appendChild(card);
    });
}

// Update summary statistics
function updateSummaryStats() {
    const totalClasses = Object.keys(scheduleData.classes).length;
    const totalWork = Object.keys(scheduleData.work).length;
    
    // Calculate only work hours, separated by job location
    const workHoursByLocation = calculateWorkHoursByLocation();
    const totalWorkHours = Object.values(workHoursByLocation).reduce((sum, hours) => sum + hours, 0);
    
    document.getElementById('totalClasses').textContent = totalClasses;
    document.getElementById('totalWork').textContent = totalWork;
    document.getElementById('totalHours').textContent = Math.round(totalWorkHours * 10) / 10;
    
    // Update the detailed work hours breakdown
    updateWorkHoursBreakdown(workHoursByLocation);
}

function calculateWorkHoursByLocation() {
    const workHoursByLocation = {};
    
    Object.values(scheduleData.work).forEach(workItem => {
        const timeRange = parseTimeRange(workItem.time);
        if (timeRange) {
            const duration = (timeRange.endMinutes - timeRange.startMinutes) / 60;
            const location = workItem.location.trim();
            
            if (!workHoursByLocation[location]) {
                workHoursByLocation[location] = 0;
            }
            workHoursByLocation[location] += duration;
        }
    });
    
    return workHoursByLocation;
}

function updateWorkHoursBreakdown(workHoursByLocation) {
    // Remove existing breakdown if it exists
    const existingBreakdown = document.getElementById('workHoursBreakdown');
    if (existingBreakdown) {
        existingBreakdown.remove();
    }
    
    // Create new breakdown section
    if (Object.keys(workHoursByLocation).length > 0) {
        const summarySection = document.querySelector('.summary-section');
        const breakdownDiv = document.createElement('div');
        breakdownDiv.id = 'workHoursBreakdown';
        breakdownDiv.className = 'work-hours-breakdown';
        
        let breakdownHTML = '<h3>Work Hours by Location</h3><div class="breakdown-grid">';
        
        // Sort locations alphabetically for consistent display
        const sortedLocations = Object.keys(workHoursByLocation).sort();
        
        sortedLocations.forEach(location => {
            const hours = Math.round(workHoursByLocation[location] * 10) / 10;
            breakdownHTML += `
                <div class="breakdown-card">
                    <div class="breakdown-number">${hours}</div>
                    <div class="breakdown-label">${location}</div>
                </div>
            `;
        });
        
        breakdownHTML += '</div>';
        breakdownDiv.innerHTML = breakdownHTML;
        
        // Insert after the main summary section
        summarySection.parentNode.insertBefore(breakdownDiv, summarySection.nextSibling);
    }
}

// Utility functions
function isValidTimeFormat(timeString) {
    const timeRangePattern = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;
    return timeRangePattern.test(timeString.trim());
}

function timeToTotalMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

// Enhanced parseTimeRange function with better validation
function parseTimeRange(timeString) {
    const timeRangePattern = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;
    const match = timeString.trim().match(timeRangePattern);
    
    if (!match) return null;

	const startHour = parseInt(match[1]);
    const startMinute = parseInt(match[2]);
    const endHour = parseInt(match[3]);
    const endMinute = parseInt(match[4]);
    
    // Validate time ranges
    if (startHour > 23 || endHour > 23 || startMinute > 59 || endMinute > 59) {
        return null;
    }
    
    const startMinutes = startHour * 60 + startMinute;
    let endMinutes = endHour * 60 + endMinute;
    
    // Handle overnight shifts (e.g., 22:00-02:00)
    if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60; // Add 24 hours
    }
    
    return {
        startMinutes: startMinutes,
        endMinutes: endMinutes
    };
}

function parseDays(daysString) {
    const daysLower = daysString.toLowerCase().replace(/\s/g, '');
    const dayMappings = {
        'monday': 0, 'mon': 0, 'm': 0,
        'tuesday': 1, 'tue': 1, 'tu': 1, 't': 1,
        'wednesday': 2, 'wed': 2, 'w': 2,
        'thursday': 3, 'thur': 3, 'thu': 3, 'th': 3, 'r': 3,
        'friday': 4, 'fri': 4, 'f': 4,
        'saturday': 5, 'sat': 5, 's': 5,
        'sunday': 6, 'sun': 6, 'su': 6, 'u': 6
    };
    
    const days = [];
    
    // Handle comma-separated format
    if (daysLower.includes(',')) {
        const dayParts = daysLower.split(',');
        dayParts.forEach(part => {
            const trimmed = part.trim();
            if (dayMappings.hasOwnProperty(trimmed)) {
                days.push(dayMappings[trimmed]);
            }
        });
    } else {
        // Handle compact format like "mwf" or "tr"
        if (daysLower.includes('th')) {
            days.push(3); // Thursday
            daysLower.replace('th', '');
        }
        if (daysLower.includes('tu')) {
            days.push(1); // Tuesday
            daysLower.replace('tu', '');
        }
        
        // Handle single letters
        for (let char of daysLower) {
            if (char === 't' && !days.includes(1) && !days.includes(3)) {
                // If 't' and no Tuesday/Thursday yet, assume Tuesday
                days.push(1);
            } else if (dayMappings.hasOwnProperty(char) && !days.includes(dayMappings[char])) {
                days.push(dayMappings[char]);
            }
        }
    }
    
    return [...new Set(days)].sort(); // Remove duplicates and sort
}

function getDayIndex(dayName) {
    const dayMappings = {
        'monday': 0,
        'tuesday': 1,
        'wednesday': 2,
        'thursday': 3,
        'friday': 4,
        'saturday': 5,
        'sunday': 6
    };
    return dayMappings[dayName.toLowerCase()];
}

function getDayName(dayIndex) {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return dayNames[dayIndex];
}

function clearClassForm() {
    document.getElementById('className').value = '';
    document.getElementById('classInstructor').value = '';
    document.getElementById('classDays').value = '';
    document.getElementById('classTime').value = '';
}

function clearWorkForm() {
    document.getElementById('workDay').value = '';
    document.getElementById('workTime').value = '';
    document.getElementById('workLocation').value = '';
}

// Handle window resize for responsive design
window.addEventListener('resize', function() {
    // Clear all existing bubbles and re-render them
    const bubbles = document.querySelectorAll('.schedule-bubble');
    bubbles.forEach(bubble => bubble.remove());
    
    // Re-visualize all items
    Object.keys(scheduleData.classes).forEach(classId => {
        visualizeScheduleItem(classId, 'class');
    });
    
    Object.keys(scheduleData.work).forEach(workId => {
        visualizeScheduleItem(workId, 'work');
    });
});

// CSV Export/Import Functions

// Download schedule data as CSV
function downloadScheduleCSV() {
    const csvData = generateCSVData();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `schedule_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Generate CSV data from current schedule
function generateCSVData() {
    const headers = ['Type', 'Title', 'Description', 'Days', 'Time', 'Color'];
    const rows = [headers.join(',')];
    
    // Add classes
    Object.values(scheduleData.classes).forEach(classItem => {
        const row = [
            'class',
            `"${escapeCSV(classItem.name)}"`,
            `"${escapeCSV(classItem.instructor || '')}"`,
            `"${classItem.days.map(dayIndex => getDayName(dayIndex)).join(', ')}"`,
            `"${escapeCSV(classItem.time)}"`,
            'blue' // Default class color
        ];
        rows.push(row.join(','));
    });
    
    // Add work sessions
    Object.values(scheduleData.work).forEach(workItem => {
        const row = [
            'work',
            'WORK',
            `"${escapeCSV(workItem.location)}"`,
            `"${getDayName(workItem.days[0])}"`,
            `"${escapeCSV(workItem.time)}"`,
            'green' // Default work color
        ];
        rows.push(row.join(','));
    });
    
    return rows.join('\n');
}

// Escape CSV special characters
function escapeCSV(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/"/g, '""');
}

// Upload and parse CSV file
function uploadScheduleCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    parseCSVData(e.target.result);
                } catch (error) {
                    alert('Error reading CSV file: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

// Parse CSV data and populate schedule
function parseCSVData(csvText) {
    const lines = csvText.trim().split('\n');
    
    if (lines.length < 2) {
        alert('CSV file appears to be empty or invalid');
        return;
    }
    
    // Skip header row
    const dataLines = lines.slice(1);
    let addedClasses = 0;
    let addedWork = 0;
    let errors = [];
    
    dataLines.forEach((line, index) => {
        try {
            const row = parseCSVRow(line);
            
            if (row.length < 5) {
                errors.push(`Row ${index + 2}: Insufficient data`);
                return;
            }
            
            const [type, title, description, days, time, color] = row;
            
            if (type.toLowerCase() === 'class') {
                if (addClassFromCSV(title, description, days, time)) {
                    addedClasses++;
                } else {
                    errors.push(`Row ${index + 2}: Invalid class data`);
                }
            } else if (type.toLowerCase() === 'work') {
                if (addWorkFromCSV(description, days, time)) {
                    addedWork++;
                } else {
                    errors.push(`Row ${index + 2}: Invalid work data`);
                }
            } else {
                errors.push(`Row ${index + 2}: Unknown type "${type}"`);
            }
        } catch (error) {
            errors.push(`Row ${index + 2}: ${error.message}`);
        }
    });
    
    // Update UI
    updateClassesList();
    updateWorkList();
    updateSummaryStats();
    
    // Show results
    let message = `Import completed!\n`;
    message += `Classes added: ${addedClasses}\n`;
    message += `Work sessions added: ${addedWork}`;
    
    if (errors.length > 0) {
        message += `\n\nErrors encountered:\n${errors.slice(0, 5).join('\n')}`;
        if (errors.length > 5) {
            message += `\n... and ${errors.length - 5} more errors`;
        }
    }
    
    alert(message);
}

// Parse a single CSV row, handling quoted fields
function parseCSVRow(row) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < row.length) {
        const char = row[i];
        
        if (char === '"') {
            if (inQuotes && row[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i += 2;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            // Field separator
            result.push(current.trim());
            current = '';
            i++;
        } else {
            current += char;
            i++;
        }
    }
    
    // Add the last field
    result.push(current.trim());
    
    return result;
}

// Add class from CSV data
function addClassFromCSV(name, instructor, daysStr, time) {
    if (!name || !daysStr || !time) {
        return false;
    }
    
    if (!isValidTimeFormat(time)) {
        return false;
    }
    
    const parsedDays = parseDaysFromCSV(daysStr);
    if (parsedDays.length === 0) {
        return false;
    }
    
    const classId = `class_${idCounter++}`;
    scheduleData.classes[classId] = {
        id: classId,
        name: name,
        instructor: instructor || '',
        days: parsedDays,
        time: time,
        type: 'class'
    };
    
    visualizeScheduleItem(classId, 'class');
    return true;
}

// Add work from CSV data
function addWorkFromCSV(location, daysStr, time) {
    if (!location || !daysStr || !time) {
        return false;
    }
    
    if (!isValidTimeFormat(time)) {
        return false;
    }
    
    // For work, we expect a single day
    const dayName = daysStr.trim();
    const dayIndex = getDayIndexFromName(dayName);
    
    if (dayIndex === -1) {
        return false;
    }
    
    const workId = `work_${idCounter++}`;
    scheduleData.work[workId] = {
        id: workId,
        day: dayName.toLowerCase(),
        days: [dayIndex],
        time: time,
        location: location,
        type: 'work'
    };
    
    visualizeScheduleItem(workId, 'work');
    return true;
}

// Parse days from CSV format (handles comma-separated full day names)
function parseDaysFromCSV(daysStr) {
    const dayNames = daysStr.split(',').map(day => day.trim());
    const dayIndices = [];
    
    dayNames.forEach(dayName => {
        const index = getDayIndexFromName(dayName);
        if (index !== -1) {
            dayIndices.push(index);
        }
    });
    
    return [...new Set(dayIndices)].sort(); // Remove duplicates and sort
}

// Get day index from full day name
function getDayIndexFromName(dayName) {
    const dayMappings = {
        'monday': 0, 'mon': 0,
        'tuesday': 1, 'tue': 1,
        'wednesday': 2, 'wed': 2,
        'thursday': 3, 'thu': 3, 'thur': 3,
        'friday': 4, 'fri': 4,
        'saturday': 5, 'sat': 5,
        'sunday': 6, 'sun': 6
    };
    
    return dayMappings[dayName.toLowerCase()] ?? -1;
}

// Clear all schedule data
function clearAllSchedule() {
    if (confirm('Are you sure you want to clear all schedule data? This cannot be undone.')) {
        // Clear data
        scheduleData.classes = {};
        scheduleData.work = {};
        
        // Remove all bubbles from UI
        const bubbles = document.querySelectorAll('.schedule-bubble');
        bubbles.forEach(bubble => bubble.remove());
        
        // Update UI
        updateClassesList();
        updateWorkList();
        updateSummaryStats();
        
        alert('All schedule data has been cleared.');
    }
}
