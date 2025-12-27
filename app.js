// AppLocker to Fleet CSP Converter
// Converts AppLocker XML exports to Fleet-compatible SyncML format

class AppLockerConverter {
    constructor() {
        this.xmlContent = '';
        this.convertedContent = '';
        this.inputTimeout = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const fileInput = document.getElementById('fileInput');
        const pasteBtn = document.getElementById('pasteBtn');
        const xmlInput = document.getElementById('xmlInput');
        const convertBtn = document.getElementById('convertBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const copyBtn = document.getElementById('copyBtn');
        const clearBtn = document.getElementById('clearBtn');

        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        pasteBtn.addEventListener('click', () => this.showPasteDialog());
        xmlInput.addEventListener('input', () => this.handleInputChange());
        convertBtn.addEventListener('click', () => this.convert());
        downloadBtn.addEventListener('click', () => this.downloadFile());
        copyBtn.addEventListener('click', () => this.copyToClipboard());
        clearBtn.addEventListener('click', () => this.clearAll());
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.xmlContent = e.target.result;
            document.getElementById('xmlInput').value = this.xmlContent;
            this.detectAndUpdateRuleTypes();
            this.updateConvertButtonState();
        };
        reader.readAsText(file);
    }

    showPasteDialog() {
        const xmlInput = document.getElementById('xmlInput');
        xmlInput.focus();
        xmlInput.select();
    }

    handleInputChange() {
        this.xmlContent = document.getElementById('xmlInput').value;
        this.updateConvertButtonState();
        
        // Debounce detection to avoid running on every keystroke
        clearTimeout(this.inputTimeout);
        this.inputTimeout = setTimeout(() => {
            this.detectAndUpdateRuleTypes();
        }, 300);
    }

    updateConvertButtonState() {
        const convertBtn = document.getElementById('convertBtn');
        convertBtn.disabled = !this.xmlContent.trim();
    }

    detectAndUpdateRuleTypes() {
        if (!this.xmlContent.trim()) {
            // Reset all checkboxes to enabled and unchecked if no content
            this.resetRuleTypeCheckboxes();
            return;
        }

        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(this.xmlContent, 'text/xml');

            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                // Invalid XML, reset checkboxes
                this.resetRuleTypeCheckboxes();
                return;
            }

            // Verify this is an AppLocker policy
            const appLockerPolicy = xmlDoc.querySelector('AppLockerPolicy');
            if (!appLockerPolicy) {
                // Not an AppLocker policy, reset checkboxes
                this.resetRuleTypeCheckboxes();
                return;
            }

            // Extract available rule types
            const availableTypes = this.detectAvailableRuleTypes(xmlDoc);
            // Use setTimeout to ensure DOM is ready
            setTimeout(() => {
                this.updateRuleTypeCheckboxes(availableTypes);
            }, 0);
        } catch (error) {
            console.error('Error detecting rule types:', error);
            // On error, reset checkboxes
            this.resetRuleTypeCheckboxes();
        }
    }

    detectAvailableRuleTypes(xmlDoc) {
        const availableTypes = new Set();
        const ruleCollections = xmlDoc.querySelectorAll('RuleCollection');

        ruleCollections.forEach(collection => {
            const type = collection.getAttribute('Type');
            if (!type) return;

            // Check if the collection has actual rule elements
            // Look for any child element that is a rule (FilePathRule, FilePublisherRule, FileHashRule, etc.)
            const hasRules = Array.from(collection.children).some(child => {
                if (child.nodeType !== Node.ELEMENT_NODE) return false;
                const tagName = child.tagName;
                return tagName && (tagName.includes('Rule') || tagName === 'RuleCollection');
            });
            
            // A collection is considered available if:
            // 1. It has actual rule elements, OR
            // 2. It has EnforcementMode="Enabled" (even if empty, it's configured)
            const isEnabled = collection.getAttribute('EnforcementMode') === 'Enabled';
            
            if (hasRules || isEnabled) {
                availableTypes.add(type);
            }
        });

        return availableTypes;
    }

    updateRuleTypeCheckboxes(availableTypes) {
        // Map XML rule types to checkbox IDs
        const typeToCheckboxId = {
            'Exe': 'exe',
            'Msi': 'msi',
            'Script': 'script',
            'Dll': 'dll',
            'Appx': 'storeapps'
        };

        // Update each checkbox
        Object.entries(typeToCheckboxId).forEach(([xmlType, checkboxId]) => {
            const checkbox = document.getElementById(checkboxId);
            if (!checkbox) {
                console.warn(`Checkbox with id '${checkboxId}' not found`);
                return;
            }
            
            const label = checkbox.closest('label');
            if (!label) {
                console.warn(`Label for checkbox '${checkboxId}' not found`);
                return;
            }
            
            if (availableTypes.has(xmlType)) {
                // Type is available: enable checkbox and auto-select it
                checkbox.disabled = false;
                checkbox.checked = true;
                label.classList.remove('disabled');
            } else {
                // Type is not available: disable checkbox and uncheck it
                checkbox.disabled = true;
                checkbox.checked = false;
                label.classList.add('disabled');
            }
        });
    }

    resetRuleTypeCheckboxes() {
        const typeToCheckboxId = {
            'Exe': 'exe',
            'Msi': 'msi',
            'Script': 'script',
            'Dll': 'dll',
            'Appx': 'storeapps'
        };

        // Reset all checkboxes to enabled, but keep current checked state
        Object.values(typeToCheckboxId).forEach(checkboxId => {
            const checkbox = document.getElementById(checkboxId);
            const label = checkbox.closest('label');
            checkbox.disabled = false;
            label.classList.remove('disabled');
        });
    }

    convert() {
        try {
            this.hideError();
            
            if (!this.xmlContent.trim()) {
                throw new Error('Please provide AppLocker XML content');
            }

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(this.xmlContent, 'text/xml');

            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('Invalid XML format. Please check your XML file.');
            }

            // Extract AppLockerPolicy
            const appLockerPolicy = xmlDoc.querySelector('AppLockerPolicy');
            if (!appLockerPolicy) {
                throw new Error('AppLockerPolicy element not found. Please ensure this is a valid AppLocker XML export.');
            }

            // Get selected rule types
            const selectedTypes = this.getSelectedRuleTypes();
            if (selectedTypes.length === 0) {
                throw new Error('Please select at least one rule type to convert.');
            }

            // Get grouping ID
            const grouping = document.getElementById('grouping').value.trim() || 'FleetAppLocker';

            // Convert each selected rule type
            const syncMLItems = [];
            
            selectedTypes.forEach(ruleType => {
                const ruleCollection = this.extractRuleCollection(xmlDoc, ruleType);
                if (ruleCollection) {
                    const syncMLItem = this.createSyncMLItem(ruleType, ruleCollection, grouping);
                    syncMLItems.push(syncMLItem);
                }
            });

            if (syncMLItems.length === 0) {
                throw new Error('No matching rule collections found for the selected types.');
            }

            // Build complete SyncML document
            this.convertedContent = this.buildSyncMLDocument(syncMLItems);

            // Display output
            this.displayOutput(this.convertedContent);
            document.getElementById('downloadBtn').disabled = false;

        } catch (error) {
            this.showError(error.message);
        }
    }

    getSelectedRuleTypes() {
        const types = [];
        const checkboxes = {
            'exe': 'Exe',
            'msi': 'Msi',
            'script': 'Script',
            'dll': 'Dll',
            'storeapps': 'Appx'
        };

        Object.entries(checkboxes).forEach(([id, type]) => {
            if (document.getElementById(id).checked) {
                types.push(type);
            }
        });

        return types;
    }

    extractRuleCollection(xmlDoc, ruleType) {
        const ruleCollections = xmlDoc.querySelectorAll('RuleCollection');
        
        for (const collection of ruleCollections) {
            const type = collection.getAttribute('Type');
            if (type === ruleType) {
                return collection;
            }
        }
        
        return null;
    }

    createSyncMLItem(ruleType, ruleCollection, grouping) {
        // Map rule types to CSP paths
        const pathMap = {
            'Exe': 'EXE',
            'Msi': 'MSI',
            'Script': 'Script',
            'Dll': 'DLL',
            'Appx': 'StoreApps'
        };

        const cspPath = pathMap[ruleType] || ruleType.toUpperCase();
        const locURI = `./Vendor/MSFT/AppLocker/ApplicationLaunchRestrictions/${grouping}/${cspPath}/Policy`;

        // Clone the rule collection and serialize it
        const ruleCollectionClone = ruleCollection.cloneNode(true);
        const serializer = new XMLSerializer();
        const ruleCollectionXML = serializer.serializeToString(ruleCollectionClone);

        // Create SyncML Item
        return {
            locURI,
            ruleCollectionXML
        };
    }

    buildSyncMLDocument(items) {
        let itemsXML = '';
        
        items.forEach(item => {
            itemsXML += `  <Item>
    <Target>
      <LocURI>${item.locURI}</LocURI>
    </Target>
    <Meta>
      <Format xmlns="syncml:metinf">chr</Format>
    </Meta>
    <Data><![CDATA[${item.ruleCollectionXML}]]></Data>
  </Item>
`;
        });

        return `<Replace>
${itemsXML}</Replace>`;
    }

    displayOutput(content) {
        const outputSection = document.getElementById('outputSection');
        const outputCode = document.getElementById('output').querySelector('code');
        
        outputCode.textContent = content;
        outputSection.style.display = 'block';
        outputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    downloadFile() {
        if (!this.convertedContent) {
            this.showError('No content to download. Please convert first.');
            return;
        }

        const blob = new Blob([this.convertedContent], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'applocker-fleet-policy.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    copyToClipboard() {
        if (!this.convertedContent) {
            this.showError('No content to copy. Please convert first.');
            return;
        }

        navigator.clipboard.writeText(this.convertedContent).then(() => {
            const copyBtn = document.getElementById('copyBtn');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅ Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            this.showError('Failed to copy to clipboard: ' + err.message);
        });
    }

    clearAll() {
        this.xmlContent = '';
        this.convertedContent = '';
        document.getElementById('xmlInput').value = '';
        document.getElementById('fileInput').value = '';
        document.getElementById('outputSection').style.display = 'none';
        document.getElementById('downloadBtn').disabled = true;
        this.hideError();
        this.resetRuleTypeCheckboxes();
        this.updateConvertButtonState();
    }

    showError(message) {
        const errorSection = document.getElementById('errorSection');
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.textContent = message;
        errorSection.style.display = 'block';
        errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    hideError() {
        document.getElementById('errorSection').style.display = 'none';
    }
}

// Initialize converter when page loads
document.addEventListener('DOMContentLoaded', () => {
    new AppLockerConverter();
});

