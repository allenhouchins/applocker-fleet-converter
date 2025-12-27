# AppLocker to Fleet Converter

A web-based tool that converts AppLocker XML policy exports into Fleet-compatible MDM (Mobile Device Management) format for easy deployment.

## 🎯 Purpose

This tool helps Windows administrators (and Mac admins managing Windows devices) create AppLocker policies that can be deployed via Fleet. It automates the conversion process, ensuring your policies are in the correct format for the AppLocker Configuration Service Provider (CSP).

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
   - Log into your Fleet console
   - Navigate to the policy configuration section
   - Upload or paste the converted SyncML file

2. **Deploy to devices**:
   - Assign the policy to your target devices or groups
   - The policy will be applied via the AppLocker CSP

### Step 4: Verify Policy Deployment

After deploying the policy, you can verify it's been applied in several ways:

#### In Fleet Console

1. **Check Policy Status**:
   - Navigate to the device or policy management section in Fleet
   - View the policy assignment status for your target devices
   - Look for successful deployment confirmations

2. **Device Compliance**:
   - Check device compliance status to ensure policies are being applied
   - Review any error messages or deployment failures

#### On the Windows Device

1. **View Applied Policies** (Local Security Policy):
   - **Note**: Policies deployed via MDM/CSP may not always be visible in the Local Security Policy GUI, even though they are active and working
   - Open **Local Security Policy** (`secpol.msc`)
   - Navigate to **Application Control Policies → AppLocker`
   - If visible, you should see your deployed policy listed under each rule type (EXE, MSI, Script, DLL, StoreApps)
   - **If the policy doesn't appear in the GUI**, this is normal - the policy is still applied and working (see testing method below)

2. **Event Viewer** (AppLocker Logs):
   - Open **Event Viewer** (`eventvwr.msc`)
   - Navigate to **Applications and Services Logs → Microsoft → Windows → AppLocker**
   - Check for policy deployment events (Event ID 8003 indicates policy was applied)
   - Review any blocked application attempts (Event ID 8004 for blocks, 8005 for audits)

3. **PowerShell Verification**:
   ```powershell
   # Check if AppLocker service is running
   Get-Service -Name AppIDSvc
   
   # View current AppLocker policies
   Get-AppLockerPolicy -Effective
   
   # View AppLocker policy from specific grouping
   Get-AppLockerPolicy -Local | Select-Object -ExpandProperty RuleCollections
   ```

4. **Test the Policy** (Most Reliable Method):
   - Try running an application that should be blocked by your policy
   - If the policy is working, you should see the "This app has been blocked" dialog
   - **This is the most reliable way to verify the policy is active** - if apps are being blocked as expected, the policy is working correctly
   - Check Event Viewer for the corresponding block event (Event ID 8004 for blocks)

**Note**: Policy deployment may take a few minutes. If the policy doesn't appear immediately, wait a few minutes and refresh, or check Fleet logs for deployment status.

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

### ⚠️ Important: Atomic Policy Deployment

**Critical Understanding**: When deploying AppLocker policies via MDM (Fleet), policies are deployed **atomically** - meaning each policy deployment **completely replaces** any previous policy with the same Grouping ID.

**What this means:**
- If you deploy Policy A (blocks App1) and then deploy Policy B (blocks App2) using the **same Grouping ID**, Policy B will **overwrite** Policy A
- App1 will **no longer be blocked** because Policy A was replaced
- **You have two options to avoid this:**

**Option 1: Single Comprehensive Policy (Recommended)**
- **Include ALL your rules (new and old) in a single policy deployment**
- Create one AppLocker policy that contains all the rules you want to enforce
- When you need to add new rules, export the complete updated policy (with all existing rules + new rules) and redeploy
- This ensures all rules are active at once

**Option 2: Use Different Grouping IDs**
- Use a **new Grouping ID** for each new policy deployment
- This creates separate policy instances that can coexist
- Each Grouping ID maintains its own set of rules independently
- **Note**: Multiple policies with different Grouping IDs will all be active simultaneously

**Examples:**
- ❌ **Wrong**: Deploy Policy1 (blocks Chrome) with Grouping ID "FleetAppLocker" → Deploy Policy2 (blocks Firefox) with same Grouping ID "FleetAppLocker" → Chrome is no longer blocked (Policy1 was replaced)
- ✅ **Correct Option 1**: Deploy Single Policy (blocks Chrome AND Firefox) with Grouping ID "FleetAppLocker" → Both apps are blocked
- ✅ **Correct Option 2**: Deploy Policy1 (blocks Chrome) with Grouping ID "FleetAppLocker" → Deploy Policy2 (blocks Firefox) with NEW Grouping ID "FleetAppLocker2" → Both apps are blocked (separate policy instances)

## 👤 End User Experience

When an AppLocker policy blocks an application, end users will see a Windows dialog box with the message:

> **"This app has been blocked by your system administrator."**

The dialog also includes a "Copy to clipboard" option for users to share the error message with IT support if needed.

![AppLocker Blocked Dialog](applocker-blocked-dialog.png)

*Example of the dialog shown to users when an application is blocked by AppLocker*

## ⚠️ Important Notes

1. **Atomic Policy Deployment**: MDM-deployed AppLocker policies are atomic - each deployment completely replaces the previous policy with the same Grouping ID. **You must include ALL your rules in a single policy deployment.** See the "Atomic Policy Deployment" section above for details.

2. **Default Rules**: When creating allow lists, remember that all inbox apps are blocked by default. You must explicitly allow system apps like Settings, Start, Email, etc.

3. **Administrator Override**: The default rules typically include an override for local administrators. Make sure this is appropriate for your environment.

4. **Testing**: Always test AppLocker policies on a small group of devices before deploying organization-wide.

5. **Policy Conflicts**: Ensure no conflicting AppLocker policies are already applied to target devices.

6. **Reboot Required**: Some AppLocker policy changes (especially Code Integrity) may require a device reboot.

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

This tool is provided as-is for use with Fleet and AppLocker policy management.

---

**Made for Windows admins deploying AppLocker policies via Fleet**

