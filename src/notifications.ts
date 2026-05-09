import { spawn, execSync } from 'node:child_process';

export function sendWindowsNotification(title: string, message: string): void {
  try {
    const ps = [
      `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null;`,
      `$template = [Windows.UI.Notifications.ToastTemplateType]::ToastText02;`,
      `$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent($template);`,
      `$xml.SelectSingleNode('//text[@id=1]').InnerText = '${title.replace(/'/g, "''")}';`,
      `$xml.SelectSingleNode('//text[@id=2]').InnerText = '${message.replace(/'/g, "''")}';`,
      `$toast = [Windows.UI.Notifications.ToastNotification]::new($xml);`,
      `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('AutoClaude').Show($toast);`,
    ].join('\n');
    execSync(`powershell -Command "${ps}"`, { timeout: 3000, stdio: 'pipe' });
  } catch {
    try {
      execSync(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $n = New-Object System.Windows.Forms.NotifyIcon; $n.Icon = [System.Drawing.SystemIcons]::Information; $n.Visible = $true; $n.ShowBalloonTip(3000, '${title}', '${message}', [System.Windows.Forms.ToolTipIcon]::Info); Start-Sleep -Seconds 4; $n.Dispose()"`, { timeout: 6000, stdio: 'pipe' });
    } catch { /* best-effort */ }
  }
}

export function sendSpeech(text: string): void {
  try {
    execSync(`powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${text.replace(/'/g, "''")}')"`, { timeout: 5000, stdio: 'pipe' });
  } catch { /* best-effort */ }
}

export function copyToClipboard(text: string): void {
  const escaped = text.replace(/'/g, "''");
  execSync(`powershell -Command "Set-Clipboard -Value '${escaped}'"`, { timeout: 5000, stdio: 'pipe' });
}

export function userPrompt(mode: 'input' | 'confirm' | 'alert', message: string, title?: string): string {
  const t = (title || 'AutoClaude').replace(/'/g, "''");
  const m = message.replace(/'/g, "''");
  
  if (mode === 'input') {
    const ps = `
      Add-Type -AssemblyName Microsoft.VisualBasic
      [Microsoft.VisualBasic.Interaction]::InputBox('${m}', '${t}', '')
    `.trim();
    try {
      return execSync(`powershell -Command "${ps}"`, { timeout: 120000, encoding: 'utf-8', stdio: 'pipe' }).trim();
    } catch { return ''; }
  }
  
  if (mode === 'confirm') {
    const ps = `
      Add-Type -AssemblyName System.Windows.Forms
      $r = [System.Windows.Forms.MessageBox]::Show('${m}', '${t}', [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)
      if ($r -eq 'Yes') { Write-Output 'yes' } else { Write-Output 'no' }
    `.trim();
    try {
      return execSync(`powershell -Command "${ps}"`, { timeout: 120000, encoding: 'utf-8', stdio: 'pipe' }).trim();
    } catch { return 'no'; }
  }
  
  const ps = `
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show('${m}', '${t}', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
    Write-Output 'ok'
  `.trim();
  try {
    execSync(`powershell -Command "${ps}"`, { timeout: 30000, encoding: 'utf-8', stdio: 'pipe' });
    return 'ok';
  } catch { return 'error'; }
}
