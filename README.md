# AppLocker to Fleet MDM

A web-based tool that converts AppLocker XML policy exports into Fleet-compatible MDM (Mobile Device Management) format for easy deployment.

## 🎯 Purpose

This tool helps Windows administrators (and Mac admins managing Windows devices) create AppLocker policies that can be deployed via Fleet MDM. It automates the conversion process, ensuring your policies are in the correct format for the AppLocker Configuration Service Provider (CSP).

## 📋 Prerequisites

- A Windows machine with AppLocker management tools installed
- Access to create and export AppLocker policies
- A web browser (no installation required)

## 🚀 Quick Start

### Step 1: Create Your AppLocker Policy in Windows

1. **Open Local Security Policy** (for local policies) or **Group Policy Management Console** (for domain policies)
   - Press `Win + R`, type `secpol.msc` and press Enter (Local Security Policy)
   - Or open Group Policy Management Console from Administrative Tools

2. **Navigate to Application Control Policies → AppLocker**

3. **Create your rules**:
   - Right-click on **Executable Rules**, **Windows Installer Rules**, **Script Rules**, **DLL Rules**, or **Packaged app Rules**
   - Select **Create New Rule**
   - Follow the wizard to create your rules

4. **Export the policy**:
   - Right-click on **AppLocker** in the left pane
   - Select **Export Policy...**
   - Choose a location and save as XML (e.g., `applocker-policy.xml`)

### Step 2: Convert Using This Tool

1. **Open the converter**:
   - Open `index.html` in your web browser
   - No server required - works offline!

2. **Upload or paste your XML**:
   - Click "Upload XML File" and select your exported AppLocker XML
   - Or click "Paste XML" and paste the contents directly

3. **Select rule types**:
   - Check the boxes for the rule types you want to include (EXE, MSI, Script, DLL, StoreApps)
   - Optionally change the Grouping ID (default: `FleetAppLocker`)

4. **Convert**:
   - Click "Convert to Fleet Format"
   - Review the output in the preview section

5. **Download**:
   - Click "Download SyncML File" to save the Fleet-compatible file
   - Or use "Copy to Clipboard" to copy the content

### Step 3: Deploy via Fleet

1. **Upload to Fleet**:
   - Log into your Fleet MDM console
   - Navigate to the policy configuration section
   - Upload or paste the converted SyncML file

2. **Deploy to devices**:
   - Assign the policy to your target devices or groups
   - The policy will be applied via the AppLocker CSP

### End User Experience

When an AppLocker policy is active and blocks an application, end users will see a Windows dialog box indicating that the app has been blocked:

![AppLocker Blocked Dialog](applocker-blocked-dialog.png)

*Example of the dialog shown to users when an application is blocked by AppLocker*

## 📖 Understanding the Conversion

### What Gets Converted?

The tool extracts `RuleCollection` elements from your AppLocker XML and converts them into SyncML format that Fleet can deploy. Each rule type (EXE, MSI, Script, DLL, StoreApps) becomes a separate policy node in the CSP.

### Key Changes Made:

1. **Removes AppLockerPolicy wrapper**: The CSP expects only the `RuleCollection` XML, not the full policy structure
2. **Creates SyncML format**: Wraps each RuleCollection in the proper SyncML structure for MDM deployment
3. **Sets correct paths**: Maps rule types to the correct AppLocker CSP paths:
   - `EXE` → `./Vendor/MSFT/AppLocker/ApplicationLaunchRestrictions/{Grouping}/EXE/Policy`
   - `MSI` → `./Vendor/MSFT/AppLocker/ApplicationLaunchRestrictions/{Grouping}/MSI/Policy`
   - `Script` → `./Vendor/MSFT/AppLocker/ApplicationLaunchRestrictions/{Grouping}/Script/Policy`
   - `DLL` → `./Vendor/MSFT/AppLocker/ApplicationLaunchRestrictions/{Grouping}/DLL/Policy`
   - `StoreApps` → `./Vendor/MSFT/AppLocker/ApplicationLaunchRestrictions/{Grouping}/StoreApps/Policy`

### Grouping ID

The Grouping ID is a unique identifier for your policy. While you can use any string, Microsoft recommends using a GUID to avoid conflicts during unenrollment. You can generate a GUID using:

**PowerShell:**
```powershell
[guid]::NewGuid()
```

**Or use an online GUID generator**

## 👤 End User Experience

When an AppLocker policy blocks an application, end users will see a Windows dialog box with the message:

> **"This app has been blocked by your system administrator."**

The dialog also includes a "Copy to clipboard" option for users to share the error message with IT support if needed.

![AppLocker Blocked Dialog](applocker-blocked-dialog.png)

*Example of the dialog shown to users when an application is blocked by AppLocker*

## ⚠️ Important Notes

1. **Default Rules**: When creating allow lists, remember that all inbox apps are blocked by default. You must explicitly allow system apps like Settings, Start, Email, etc.

2. **Administrator Override**: The default rules typically include an override for local administrators. Make sure this is appropriate for your environment.

3. **Testing**: Always test AppLocker policies on a small group of devices before deploying organization-wide.

4. **Policy Conflicts**: Ensure no conflicting AppLocker policies are already applied to target devices.

5. **Reboot Required**: Some AppLocker policy changes (especially Code Integrity) may require a device reboot.

## 🔧 Troubleshooting

### Error: "AppLockerPolicy element not found"
- Ensure you exported the policy from AppLocker, not created it manually
- Verify the XML file is a valid AppLocker export

### Error: "No matching rule collections found"
- Check that you've selected the correct rule types
- Verify your exported policy contains rules for those types

### Deployment Error 516
- This usually indicates a format error
- Ensure you're using the converted file, not the original AppLocker export
- Verify the Grouping ID doesn't contain invalid characters

### Policy Not Applying
- Check that devices are properly enrolled in Fleet
- Verify the policy is assigned to the correct device groups
- Review Fleet logs for deployment errors
- Ensure Windows version supports AppLocker CSP (Windows 10 version 1511 or later)

## 📚 Additional Resources

- [Microsoft AppLocker CSP Documentation](https://learn.microsoft.com/en-us/windows/client-management/mdm/applocker-csp)
- [AppLocker Overview](https://learn.microsoft.com/en-us/windows/security/threat-protection/windows-defender-application-control/applocker/applocker-overview)
- [Fleet Documentation](https://fleetdm.com/docs)

## 🛠️ Technical Details

### File Structure
```
applocker-fleet-converter/
├── index.html      # Main web interface
├── app.js          # Conversion logic
├── styles.css      # Styling
└── README.md       # This file
```

### How It Works

1. **XML Parsing**: Uses the browser's built-in `DOMParser` to parse the AppLocker XML
2. **Rule Extraction**: Extracts `RuleCollection` elements based on selected rule types
3. **SyncML Generation**: Creates SyncML `Replace` operations for each rule collection
4. **Format Conversion**: Wraps RuleCollection XML in CDATA sections within SyncML Items

### Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## 📝 Example Use Cases

1. **Blocking Specific Applications**: Create a deny rule for unwanted software
2. **Application Whitelisting**: Allow only approved applications to run
3. **Script Control**: Restrict PowerShell and other script execution
4. **DLL Protection**: Control which DLLs can be loaded
5. **Store App Management**: Control Microsoft Store app execution

## 🤝 Contributing

Found a bug or have a feature request? Please open an issue or submit a pull request!

## 📄 License

This tool is provided as-is for use with Fleet MDM and AppLocker policy management.

---

**Made for Windows admins deploying AppLocker policies via Fleet MDM**

