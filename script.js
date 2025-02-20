let items = JSON.parse(localStorage.getItem('items')) || {
    needed: [],
    available: []
};

let selectedItems = new Set();

// Separate Sets für die Überschriften jeder Liste
const NEEDED_HEADERS = new Set([
    'MANUELLE EINGABE',
    'FLEISCH',
    'GEMÜSE & FRISCHE KRÄUTER',
    'GETREIDEPRODUKTE & GETROCKNETE HÜLSENFRÜCHTE',
    'KALTES FLEISCH & WÜRSTCHEN',
    'MILCHPRODUKTE INKL. BUTTER',
    'SONSTIGES',
    'WEITERE EINKÄUFE'
]);

const AVAILABLE_HEADERS = new Set();

function saveItems() {
    localStorage.setItem('items', JSON.stringify(items));
}

function deleteItem(list, index) {
    items[list].splice(index, 1);
    saveItems();
    renderLists();
}

function moveItem(fromList, index) {
    const toList = fromList === 'needed' ? 'available' : 'needed';
    const item = items[fromList][index];
    
    items[fromList].splice(index, 1);
    items[toList].push(item);
    
    saveItems();
    renderLists();
}

function renderLists() {
    const neededList = document.getElementById('neededItems');
    const availableList = document.getElementById('availableItems');
    
    neededList.innerHTML = '';
    availableList.innerHTML = '';
    
    renderGroupedList(neededList, items.needed, 'needed');
    renderGroupedList(availableList, items.available, 'available');
}

function renderGroupedList(listElement, items, listName) {
    listElement.innerHTML = '';
    
    // Wähle das richtige Set von Überschriften
    const headers = listName === 'available' ? AVAILABLE_HEADERS : NEEDED_HEADERS;
    
    if (listName === 'available') {
        // Für die Vorrätig-Liste: Zeige alle Überschriften und mache sie verschiebbar
        items.forEach((item, index) => {
            const cleanItem = item.trim();
            
            if (headers.has(cleanItem)) {
                const header = document.createElement('h3');
                header.className = 'category-header';
                header.draggable = true;
                
                // Drag-Handle hinzufügen
                const dragHandle = document.createElement('span');
                dragHandle.className = 'drag-handle';
                dragHandle.innerHTML = '⋮';
                header.appendChild(dragHandle);
                
                // Text-Container für den Header
                const headerText = document.createElement('span');
                headerText.textContent = cleanItem;
                header.appendChild(headerText);
                
                // Drag & Drop Events
                header.addEventListener('dragstart', (e) => {
                    e.stopPropagation();
                    header.classList.add('dragging');
                    e.dataTransfer.setData('text/plain', JSON.stringify({
                        isHeader: true,
                        header: cleanItem,
                        index: index
                    }));
                });
                
                header.addEventListener('dragend', () => {
                    header.classList.remove('dragging');
                    // Speichere die neue Reihenfolge
                    const headers = [...availableList.querySelectorAll('.category-header')]
                        .map(h => h.textContent);
                    items.available = reorderItemsByHeaders(items.available, headers);
                    saveItems();
                });
                
                // Lösch-Button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-header-btn';
                deleteBtn.innerHTML = '×';
                deleteBtn.title = 'Überschrift entfernen';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    AVAILABLE_HEADERS.delete(cleanItem);
                    items[listName] = items[listName].filter(i => i !== cleanItem);
                    localStorage.setItem('availableHeaders', JSON.stringify([...AVAILABLE_HEADERS]));
                    saveItems();
                    renderLists();
                };
                header.appendChild(deleteBtn);
                listElement.appendChild(header);
                return;
            }
            
            // Normales Item
            renderItem(item, index, listName, listElement);
        });
    } else {
        // Für die Wird benötigt-Liste: Zeige Überschriften nur wenn Items darunter sind
        items.forEach((item, index) => {
            const cleanItem = item.trim();
            
            if (headers.has(cleanItem)) {
                // Prüfe, ob es Items unter dieser Überschrift bis zur nächsten Überschrift gibt
                const nextHeaderIndex = items.slice(index + 1).findIndex(nextItem => 
                    NEEDED_HEADERS.has(nextItem.trim())
                );
                
                const itemsUntilNextHeader = nextHeaderIndex === -1 
                    ? items.slice(index + 1) 
                    : items.slice(index + 1, index + 1 + nextHeaderIndex);
                
                const hasNormalItems = itemsUntilNextHeader.some(nextItem => {
                    const nextCleanItem = nextItem.trim();
                    return !NEEDED_HEADERS.has(nextCleanItem);
                });
                
                if (hasNormalItems) {
                    const header = document.createElement('h3');
                    header.className = 'category-header';
                    header.textContent = cleanItem;
                    listElement.appendChild(header);
                }
                return;
            }
            
            // Normales Item
            renderItem(item, index, listName, listElement);
        });
    }
}

// Hilfsfunktion zum Rendern eines normalen Items
function renderItem(item, index, listName, listElement) {
    const itemText = item.includes(' | ') ? item.split(' | ')[1] : item;
    const li = document.createElement('li');
    li.draggable = true;
    
    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'item-checkbox';
    checkbox.checked = false; // Immer unchecked starten
    
    // Unterschiedliches Verhalten je nach Liste
    if (listName === 'available') {
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                // In der Vorrätig-Liste: Item löschen wenn abgehakt
                deleteItem(listName, index);
            }
        });
    } else {
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                moveItem(listName, index);
            }
        });
    }
    
    // Item Content
    const itemContent = document.createElement('div');
    itemContent.className = 'item-content';
    
    const span = document.createElement('span');
    span.className = 'item-text';
    span.textContent = itemText;
    
    // Buttons
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    
    const moveBtn = document.createElement('button');
    moveBtn.className = 'move-btn';
    moveBtn.textContent = listName === 'needed' ? '✓' : '↩';
    moveBtn.onclick = () => {
        moveItem(listName, index);
        checkbox.checked = !checkbox.checked;
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.onclick = () => deleteItem(listName, index);
    
    // Zusammenbauen
    actions.appendChild(moveBtn);
    actions.appendChild(deleteBtn);
    itemContent.appendChild(span);
    itemContent.appendChild(actions);
    li.appendChild(checkbox);
    li.appendChild(itemContent);
    
    // Drag & Drop
    li.addEventListener('dragstart', (e) => {
        li.classList.add('dragging');
        e.dataTransfer.setData('text/plain', JSON.stringify({
            item: items[index],
            fromList: listName,
            index: index
        }));
    });
    
    li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
    });
    
    listElement.appendChild(li);
}

function toggleItemSelection(li, list, index) {
    const itemKey = `${list}-${index}`;
    const checkbox = li.querySelector('.item-checkbox');
    
    if (selectedItems.has(itemKey)) {
        selectedItems.delete(itemKey);
        li.classList.remove('selected');
        checkbox.checked = false;
    } else {
        selectedItems.add(itemKey);
        li.classList.add('selected');
        checkbox.checked = true;
    }
    updateBulkActions();
}

function clearSelection() {
    selectedItems.clear();
    document.querySelectorAll('li.selected').forEach(li => {
        li.classList.remove('selected');
        li.querySelector('.item-checkbox').checked = false;
    });
    updateBulkActions();
}

function updateBulkActions() {
    const bulkActions = document.querySelector('.bulk-actions');
    if (selectedItems.size > 0) {
        bulkActions.classList.add('active');
    } else {
        bulkActions.classList.remove('active');
    }
}

function moveSelectedItems(targetList) {
    const itemsToMove = Array.from(selectedItems).map(key => {
        const [list, index] = key.split('-');
        return { list, index: parseInt(index) };
    });
    
    // Sortiere nach Index absteigend, um Probleme beim Löschen zu vermeiden
    itemsToMove.sort((a, b) => b.index - a.index);
    
    itemsToMove.forEach(({ list, index }) => {
        moveItem(list, index);
    });
    
    clearSelection();
}

function setupDragAndDrop() {
    const lists = document.querySelectorAll('.list');
    
    lists.forEach(list => {
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            list.classList.add('drag-over');
        });

        list.addEventListener('dragleave', () => {
            list.classList.remove('drag-over');
        });

        list.addEventListener('drop', (e) => {
            e.preventDefault();
            list.classList.remove('drag-over');
            
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            const targetList = list.querySelector('ul').id === 'neededItems' ? 'needed' : 'available';
            
            if (data.fromList !== targetList) {
                moveItem(data.fromList, data.index);
            }
        });
    });
}

// Dialog-bezogene Funktionen zusammen gruppieren
function showBulkInputDialog() {
    const dialog = document.getElementById('bulkInputDialog');
    const textarea = document.getElementById('bulkInput');
    
    if (dialog && textarea) {
        dialog.classList.add('visible');
        textarea.value = ''; // Leere das Textfeld
        textarea.focus();    // Setze den Fokus
    }
}

function closeBulkInputDialog() {
    const dialog = document.getElementById('bulkInputDialog');
    dialog.classList.remove('visible');
    document.getElementById('bulkInput').value = '';
}

function addBulkItems(targetList) {
    const textarea = document.getElementById('bulkInput');
    const textareaValue = textarea?.value || '';
    
    if (!textarea) {
        console.error('Textarea nicht gefunden!');
        return;
    }

    const lines = textareaValue
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    if (lines.length > 0) {
        try {
            if (targetList === 'needed') {
                // Spezielle Behandlung für die "Wird benötigt" Liste
                let currentCategory = '';
                
                lines.forEach(line => {
                    const cleanLine = line.replace(/^\s+/, '');
                    
                    if (!line.startsWith(' ') && (NEEDED_HEADERS.has(cleanLine) || /^[A-ZÄÖÜ\s&]+$/.test(cleanLine))) {
                        currentCategory = cleanLine;
                        // Füge die Kategorie nur hinzu, wenn sie noch nicht existiert
                        if (!items.needed.includes(currentCategory)) {
                            items.needed.push(currentCategory);
                        }
                    } else if (cleanLine.trim()) {
                        const itemWithCategory = currentCategory 
                            ? `${currentCategory} | ${cleanLine}`
                            : cleanLine;
                        
                        // Füge das Item direkt nach der letzten Zeile seiner Kategorie ein
                        if (currentCategory) {
                            const lastItemIndex = findLastItemIndexForCategory(items.needed, currentCategory);
                            items.needed.splice(lastItemIndex + 1, 0, itemWithCategory);
                        } else {
                            items.needed.push(itemWithCategory);
                        }
                    }
                });
            } else {
                // Bestehende Logik für die "Vorrätig" Liste
                const updatedItems = [...items[targetList]];
                let currentCategory = '';
                
                lines.forEach(line => {
                    const cleanLine = line.replace(/^\s+/, '');
                    
                    if (!line.startsWith(' ') && (NEEDED_HEADERS.has(cleanLine) || AVAILABLE_HEADERS.has(cleanLine) || /^[A-ZÄÖÜ\s&]+$/.test(cleanLine))) {
                        currentCategory = cleanLine;
                        if (targetList === 'available') {
                            AVAILABLE_HEADERS.add(cleanLine);
                            // Nur hinzufügen wenn die Überschrift noch nicht existiert
                            if (!updatedItems.includes(currentCategory)) {
                                updatedItems.push(currentCategory);
                            }
                        } else if (!updatedItems.includes(currentCategory)) {
                            updatedItems.push(currentCategory);
                        }
                    } else if (cleanLine.trim()) {
                        const itemWithCategory = currentCategory 
                            ? `${currentCategory} | ${cleanLine}`
                            : cleanLine;
                        // Prüfen ob das Item bereits existiert
                        if (!updatedItems.includes(itemWithCategory)) {
                            if (currentCategory && targetList === 'needed') {
                                // Finde den Index der Kategorie und füge das Item direkt danach ein
                                const categoryIndex = updatedItems.indexOf(currentCategory);
                                if (categoryIndex !== -1) {
                                    // Finde den Index für das neue Item
                                    let insertIndex = categoryIndex + 1;
                                    while (insertIndex < updatedItems.length && 
                                           updatedItems[insertIndex].startsWith(currentCategory + ' |')) {
                                        insertIndex++;
                                    }
                                    updatedItems.splice(insertIndex, 0, itemWithCategory);
                                }
                            } else {
                                updatedItems.push(itemWithCategory);
                            }
                        }
                    }
                });
                
                items[targetList] = updatedItems;
            }
            
            saveItems();
            localStorage.setItem('availableHeaders', JSON.stringify([...AVAILABLE_HEADERS]));
            renderLists();
            closeBulkInputDialog();
        } catch (error) {
            console.error('Fehler beim Hinzufügen der Items:', error);
        }
    }
}

// Hilfsfunktion zum Finden des letzten Items einer Kategorie
function findLastItemIndexForCategory(items, category) {
    for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].startsWith(category + ' |') || items[i] === category) {
            return i;
        }
    }
    return items.length - 1;
}

// Neue Funktion zum Löschen einer ganzen Liste
function clearList(listName) {
    if (confirm(`Möchten Sie wirklich die gesamte "${listName === 'needed' ? 'Wird benötigt' : 'Vorrätig'}"-Liste löschen?`)) {
        items[listName] = [];
        saveItems();
        renderLists();
    }
}

// Neue Funktionen für das Hinzufügen von Überschriften
function showAddHeaderDialog(targetList) {
    const dialog = document.getElementById('addHeaderDialog');
    const input = document.getElementById('headerInput');
    const addBtn = document.getElementById('addHeaderBtn');
    const cancelBtn = document.getElementById('cancelHeaderBtn');
    
    // Dialog anzeigen
    dialog.classList.add('visible');
    input.value = '';
    input.focus();
    
    // Event Listener für Buttons
    addBtn.onclick = () => {
        const headerText = input.value.trim().toUpperCase();
        if (headerText) {
            // Füge die Überschrift zur entsprechenden Liste hinzu
            if (targetList === 'available') {
                AVAILABLE_HEADERS.add(headerText);
                // Füge die Überschrift am Ende der Liste hinzu
                items[targetList].push(headerText);
            }
            saveItems();
            // Speichere die Überschriften im localStorage
            localStorage.setItem('availableHeaders', JSON.stringify([...AVAILABLE_HEADERS]));
            renderLists();
            closeAddHeaderDialog();
        }
    };
    
    cancelBtn.onclick = closeAddHeaderDialog;
    
    // Enter-Taste Unterstützung
    input.onkeypress = (e) => {
        if (e.key === 'Enter') {
            addBtn.click();
        }
    };
}

function closeAddHeaderDialog() {
    const dialog = document.getElementById('addHeaderDialog');
    dialog.classList.remove('visible');
}

// Aktualisiere die Event-Listener-Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    // Dialog Event-Listener
    const dialog = document.getElementById('bulkInputDialog');
    const addToNeededBtn = document.getElementById('addToNeeded');
    const addToAvailableBtn = document.getElementById('addToAvailable');
    const cancelBtn = document.getElementById('cancelBulkInput');

    // Liste einfügen Button Event-Listener entfernen
    // if (showBulkInputBtn) {
    //     showBulkInputBtn.addEventListener('click', () => {
    //         dialog.classList.add('visible');
    //     });
    // }

    // Dialog-Buttons
    if (addToNeededBtn) {
        addToNeededBtn.addEventListener('click', () => addBulkItems('needed'));
    }
    
    if (addToAvailableBtn) {
        addToAvailableBtn.addEventListener('click', () => addBulkItems('available'));
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeBulkInputDialog);
    }

    // Klick außerhalb des Dialogs schließt ihn
    if (dialog) {
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeBulkInputDialog();
            }
        });
    }

    // ESC-Taste schließt den Dialog
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeBulkInputDialog();
        }
    });

    // Rest der Initialisierung...
    renderLists();
    setupDragAndDrop();
    setupHeaderDragAndDrop();

    // Beim Laden der Seite die gespeicherten Überschriften wiederherstellen
    const savedHeaders = localStorage.getItem('availableHeaders');
    if (savedHeaders) {
        const headers = JSON.parse(savedHeaders);
        headers.forEach(header => AVAILABLE_HEADERS.add(header));
    }

    // Theme Initialisierung
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Verbesserte Touch-Ereignisse für iOS
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        // Verhindert unerwünschtes Scrollen beim Drag & Drop
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('.dragging')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Verbesserte Touch-Feedback
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('touchstart', () => {
                button.style.opacity = '0.7';
            });
            button.addEventListener('touchend', () => {
                button.style.opacity = '1';
            });
        });
    }
    
    // Verhindert iOS Bounce-Effekt bei Modal-Dialogen
    const dialogs = document.querySelectorAll('.dialog');
    dialogs.forEach(dialog => {
        dialog.addEventListener('touchmove', (e) => {
            if (e.target === dialog) {
                e.preventDefault();
            }
        }, { passive: false });
    });
});

// Klick außerhalb der Liste hebt die Auswahl auf
document.addEventListener('click', (e) => {
    if (!e.target.closest('li') && !e.target.closest('.bulk-actions')) {
        clearSelection();
    }
});

function setupHeaderDragAndDrop() {
    const availableList = document.getElementById('availableItems');
    
    availableList.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingHeader = availableList.querySelector('.category-header.dragging');
        if (!draggingHeader) return;
        
        const siblings = [...availableList.querySelectorAll('.category-header:not(.dragging)')];
        const nextSibling = siblings.find(sibling => {
            const box = sibling.getBoundingClientRect();
            return e.clientY <= box.top + box.height / 2;
        });
        
        if (nextSibling) {
            availableList.insertBefore(draggingHeader, nextSibling);
        } else {
            availableList.appendChild(draggingHeader);
        }
    });
}

// Hilfsfunktion zum Neuordnen der Items nach Header-Reihenfolge
function reorderItemsByHeaders(items, headerOrder) {
    const result = [];
    const itemsByHeader = {};
    let currentHeader = null;
    
    // Gruppiere Items nach Headern
    items.forEach(item => {
        if (AVAILABLE_HEADERS.has(item)) {
            currentHeader = item;
            itemsByHeader[currentHeader] = [];
        } else if (currentHeader) {
            itemsByHeader[currentHeader].push(item);
        } else {
            result.push(item);
        }
    });
    
    // Füge Items in neuer Reihenfolge zusammen
    headerOrder.forEach(header => {
        result.push(header);
        if (itemsByHeader[header]) {
            result.push(...itemsByHeader[header]);
        }
    });
    
    return result;
}

function addItemToList(listName, input) {
    const itemName = input.value.trim();
    if (itemName) {
        if (listName === 'available') {
            // Für die Vorrätig-Liste
            items[listName].push(itemName);
        } else {
            // Für die Wird benötigt-Liste
            if (!items.needed.includes('MANUELLE EINGABE')) {
                items.needed.unshift('MANUELLE EINGABE');
            }
            const headerIndex = items.needed.indexOf('MANUELLE EINGABE');
            items.needed.splice(headerIndex + 1, 0, `MANUELLE EINGABE | ${itemName}`);
        }
        saveItems();
        renderLists();
        input.value = '';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Icon aktualisieren
    const icon = document.querySelector('#themeToggle i');
    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
} 