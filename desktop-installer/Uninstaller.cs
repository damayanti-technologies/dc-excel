using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
using Microsoft.Win32;

namespace DCExcel
{
    static class Uninstaller
    {
        [STAThread]
        static void Main()
        {
            DialogResult dr = MessageBox.Show(
                "Are you sure you want to completely remove DC Excel by Damayanti Crest from your computer?",
                "DC Excel Uninstall",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );

            if (dr != DialogResult.Yes)
            {
                return;
            }

            try
            {
                // 1. Remove Desktop Shortcut
                string desktopShortcut = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "DC Excel.lnk");
                if (File.Exists(desktopShortcut))
                {
                    File.Delete(desktopShortcut);
                }

                // 2. Remove Start Menu Shortcut
                string startMenuFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "Damayanti Crest");
                string startMenuShortcut = Path.Combine(startMenuFolder, "DC Excel.lnk");
                if (File.Exists(startMenuShortcut))
                {
                    File.Delete(startMenuShortcut);
                }
                if (Directory.Exists(startMenuFolder) && Directory.GetFiles(startMenuFolder).Length == 0)
                {
                    Directory.Delete(startMenuFolder);
                }

                // 3. Remove Registry Uninstall Key
                try
                {
                    Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\DCExcel", false);
                }
                catch { }

                // 4. Schedule self-deletion of installation directory
                string appDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\DC Excel");
                if (Directory.Exists(appDir))
                {
                    // Use cmd.exe timeout to delete the folder after uninstaller process exits
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = "/C timeout /t 2 /nobreak > NUL & rd /s /q \"" + appDir + "\"",
                        WindowStyle = ProcessWindowStyle.Hidden,
                        CreateNoWindow = true
                    };
                    Process.Start(psi);
                }

                MessageBox.Show(
                    "DC Excel was successfully removed from your computer.",
                    "DC Excel Uninstall",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "An error occurred during uninstallation: " + ex.Message,
                    "DC Excel Uninstall",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
    }
}
