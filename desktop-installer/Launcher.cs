using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace DCExcel
{
    static class Launcher
    {
        [STAThread]
        static void Main()
        {
            string targetUrl = "https://dc-excel.damayanticrest.online/";

            // Try Microsoft Edge in standalone app window mode
            string[] edgePaths = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe")
            };

            foreach (string edge in edgePaths)
            {
                if (File.Exists(edge))
                {
                    try
                    {
                        Process.Start(new ProcessStartInfo
                        {
                            FileName = edge,
                            Arguments = "--app=\"" + targetUrl + "\" --new-window",
                            UseShellExecute = false
                        });
                        return;
                    }
                    catch { }
                }
            }

            // Try Google Chrome in standalone app window mode
            string[] chromePaths = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe")
            };

            foreach (string chrome in chromePaths)
            {
                if (File.Exists(chrome))
                {
                    try
                    {
                        Process.Start(new ProcessStartInfo
                        {
                            FileName = chrome,
                            Arguments = "--app=\"" + targetUrl + "\" --new-window",
                            UseShellExecute = false
                        });
                        return;
                    }
                    catch { }
                }
            }

            // Fallback to default browser
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = targetUrl,
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Unable to launch DC Excel: " + ex.Message,
                    "DC Excel",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
    }
}
