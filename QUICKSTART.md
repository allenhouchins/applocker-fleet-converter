# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Export Your AppLocker Policy

On a Windows machine:
1. Open **Local Security Policy** (`secpol.msc`) or **Group Policy Management Console**
2. Navigate to **Application Control Policies → AppLocker**
3. Right-click **AppLocker** → **Export Policy...**
4. Save as XML file

### 2. Convert with the Web Tool

1. Open `index.html` in your web browser
2. Upload your XML file or paste the contents
3. Select which rule types to include (EXE, MSI, Script, DLL, StoreApps)
4. Click **Convert to Fleet Format**
5. Click **Download SyncML File**

### 3. Deploy via Fleet

1. Upload the downloaded file to Fleet
2. Assign to your device groups
3. Done! 🎉

## 💡 Tips

- **Test first**: Always test on a small group before deploying organization-wide
- **Grouping ID**: Use a unique GUID to avoid conflicts (generate with `[guid]::NewGuid()` in PowerShell)
- **Default rules**: Remember that allow lists block all apps by default - include system apps!
- **Administrators**: Default rules usually allow admins to run anything - adjust if needed

## ❓ Common Issues

**"AppLockerPolicy element not found"**
→ Make sure you exported from AppLocker, not created manually

**"No matching rule collections found"**
→ Check that you selected the correct rule types that exist in your policy

**Deployment error 516**
→ Use the converted file, not the original export

## 📚 Need More Help?

See the full [README.md](README.md) for detailed documentation.

