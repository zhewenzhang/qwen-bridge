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
