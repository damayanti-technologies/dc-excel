using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace DCExcelInstaller
{
    public class SetupForm : Form
    {
        private Panel headerPanel;
        private Label titleLabel;
        private Label subtitleLabel;
        private Label welcomeLabel;
        private Label descLabel;
        private Panel pathPanel;
        private Label pathHeaderLabel;
        private Label pathValueLabel;
        private Label pathInfoLabel;
        private CheckBox cbDesktop;
        private CheckBox cbStartMenu;
        private CheckBox cbLaunch;
        private ProgressBar progressBar;
        private Label statusLabel;
        private Panel footerPanel;
        private Label versionLabel;
        private Button btnCancel;
        private Button btnInstall;

        private bool isInstalled = false;
        private string installDir;

        public SetupForm()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.SuspendLayout();

            this.Text = "DC Excel Setup — Damayanti Crest";
            this.Size = new Size(560, 440);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = true;
            this.BackColor = Color.FromArgb(18, 18, 20); // #121214
            this.ForeColor = Color.FromArgb(244, 244, 245);
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            // Install directory
            installDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\DC Excel");

            // 1. Header Panel
            headerPanel = new Panel();
            headerPanel.Dock = DockStyle.Top;
            headerPanel.Height = 76;
            headerPanel.BackColor = Color.FromArgb(9, 9, 11); // #09090b
            headerPanel.Paint += (s, e) =>
            {
                // Emerald brand accent line at bottom
                using (Pen pen = new Pen(Color.FromArgb(39, 39, 42))) // #27272a
                {
                    e.Graphics.DrawLine(pen, 0, headerPanel.Height - 1, headerPanel.Width, headerPanel.Height - 1);
                }
                // Emerald logo icon badge
                Rectangle badgeRect = new Rectangle(20, 18, 40, 40);
                using (SolidBrush brush = new SolidBrush(Color.FromArgb(16, 185, 129))) // #10b981
                {
                    e.Graphics.FillRectangle(brush, badgeRect);
                }
                // "DC" text in badge
                using (Font badgeFont = new Font("Segoe UI", 12F, FontStyle.Bold))
                using (SolidBrush textBrush = new SolidBrush(Color.FromArgb(9, 9, 11)))
                {
                    StringFormat sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
                    e.Graphics.DrawString("DC", badgeFont, textBrush, badgeRect, sf);
                }
            };

            titleLabel = new Label();
            titleLabel.Text = "DC Excel Desktop Setup";
            titleLabel.Font = new Font("Segoe UI", 13F, FontStyle.Bold);
            titleLabel.ForeColor = Color.White;
            titleLabel.Location = new Point(72, 16);
            titleLabel.AutoSize = true;
            headerPanel.Controls.Add(titleLabel);

            subtitleLabel = new Label();
            subtitleLabel.Text = "Damayanti Crest  •  Create. Calculate. Analyse.";
            subtitleLabel.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            subtitleLabel.ForeColor = Color.FromArgb(16, 185, 129); // #10b981
            subtitleLabel.Location = new Point(73, 42);
            subtitleLabel.AutoSize = true;
            headerPanel.Controls.Add(subtitleLabel);

            // 2. Footer Panel
            footerPanel = new Panel();
            footerPanel.Dock = DockStyle.Bottom;
            footerPanel.Height = 56;
            footerPanel.BackColor = Color.FromArgb(9, 9, 11);
            footerPanel.Paint += (s, e) =>
            {
                using (Pen pen = new Pen(Color.FromArgb(39, 39, 42)))
                {
                    e.Graphics.DrawLine(pen, 0, 0, footerPanel.Width, 0);
                }
            };

            versionLabel = new Label();
            versionLabel.Text = "v1.0.0 Production Release";
            versionLabel.ForeColor = Color.FromArgb(113, 113, 122);
            versionLabel.Location = new Point(20, 20);
            versionLabel.AutoSize = true;
            footerPanel.Controls.Add(versionLabel);

            btnCancel = new Button();
            btnCancel.Text = "Cancel";
            btnCancel.Size = new Size(88, 32);
            btnCancel.Location = new Point(340, 12);
            btnCancel.FlatStyle = FlatStyle.Flat;
            btnCancel.FlatAppearance.BorderColor = Color.FromArgb(63, 63, 70);
            btnCancel.ForeColor = Color.FromArgb(212, 212, 216);
            btnCancel.BackColor = Color.FromArgb(24, 24, 27);
            btnCancel.Cursor = Cursors.Hand;
            btnCancel.Click += (s, e) => this.Close();
            footerPanel.Controls.Add(btnCancel);

            btnInstall = new Button();
            btnInstall.Text = "Install Now";
            btnInstall.Size = new Size(104, 32);
            btnInstall.Location = new Point(436, 12);
            btnInstall.FlatStyle = FlatStyle.Flat;
            btnInstall.FlatAppearance.BorderSize = 0;
            btnInstall.BackColor = Color.FromArgb(16, 185, 129); // #10b981
            btnInstall.ForeColor = Color.FromArgb(9, 9, 11);
            btnInstall.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnInstall.Cursor = Cursors.Hand;
            btnInstall.Click += BtnInstall_Click;
            footerPanel.Controls.Add(btnInstall);

            // 3. Body Controls
            welcomeLabel = new Label();
            welcomeLabel.Text = "Install DC Excel on your computer";
            welcomeLabel.Font = new Font("Segoe UI", 10.5F, FontStyle.Bold);
            welcomeLabel.ForeColor = Color.White;
            welcomeLabel.Location = new Point(22, 92);
            welcomeLabel.AutoSize = true;

            descLabel = new Label();
            descLabel.Text = "DC Excel will be installed to your user directory with complete offline spreadsheet capability, formula engine, and tools hub.";
            descLabel.ForeColor = Color.FromArgb(161, 161, 170);
            descLabel.Location = new Point(22, 118);
            descLabel.Size = new Size(500, 36);

            // Path panel
            pathPanel = new Panel();
            pathPanel.Location = new Point(24, 160);
            pathPanel.Size = new Size(496, 58);
            pathPanel.BackColor = Color.FromArgb(24, 24, 27);
            pathPanel.Paint += (s, e) =>
            {
                using (Pen pen = new Pen(Color.FromArgb(39, 39, 42)))
                {
                    e.Graphics.DrawRectangle(pen, 0, 0, pathPanel.Width - 1, pathPanel.Height - 1);
                }
            };

            pathHeaderLabel = new Label();
            pathHeaderLabel.Text = "Installation Directory:";
            pathHeaderLabel.ForeColor = Color.FromArgb(113, 113, 122);
            pathHeaderLabel.Font = new Font("Segoe UI", 8F, FontStyle.Regular);
            pathHeaderLabel.Location = new Point(12, 8);
            pathHeaderLabel.AutoSize = true;
            pathPanel.Controls.Add(pathHeaderLabel);

            pathValueLabel = new Label();
            pathValueLabel.Text = installDir;
            pathValueLabel.ForeColor = Color.FromArgb(244, 244, 245);
            pathValueLabel.Font = new Font("Consolas", 8.5F, FontStyle.Regular);
            pathValueLabel.Location = new Point(12, 28);
            pathValueLabel.AutoSize = true;
            pathPanel.Controls.Add(pathValueLabel);

            pathInfoLabel = new Label();
            pathInfoLabel.Text = "Space Required: ~2 MB  •  No Administrator privileges required";
            pathInfoLabel.ForeColor = Color.FromArgb(113, 113, 122);
            pathInfoLabel.Font = new Font("Segoe UI", 8F, FontStyle.Regular);
            pathInfoLabel.Location = new Point(24, 224);
            pathInfoLabel.AutoSize = true;

            // Checkboxes
            cbDesktop = new CheckBox();
            cbDesktop.Text = "Create Desktop Shortcut";
            cbDesktop.Checked = true;
            cbDesktop.ForeColor = Color.FromArgb(228, 228, 231);
            cbDesktop.Location = new Point(26, 250);
            cbDesktop.AutoSize = true;

            cbStartMenu = new CheckBox();
            cbStartMenu.Text = "Create Start Menu entry (Damayanti Crest \\ DC Excel)";
            cbStartMenu.Checked = true;
            cbStartMenu.ForeColor = Color.FromArgb(228, 228, 231);
            cbStartMenu.Location = new Point(26, 274);
            cbStartMenu.AutoSize = true;

            cbLaunch = new CheckBox();
            cbLaunch.Text = "Launch DC Excel when installation finishes";
            cbLaunch.Checked = true;
            cbLaunch.ForeColor = Color.FromArgb(228, 228, 231);
            cbLaunch.Location = new Point(26, 298);
            cbLaunch.AutoSize = true;

            // Progress bar and status
            progressBar = new ProgressBar();
            progressBar.Location = new Point(26, 328);
            progressBar.Size = new Size(494, 10);
            progressBar.Visible = false;

            statusLabel = new Label();
            statusLabel.Text = "";
            statusLabel.ForeColor = Color.FromArgb(161, 161, 170);
            statusLabel.Location = new Point(26, 344);
            statusLabel.Size = new Size(494, 20);
            statusLabel.Visible = false;

            // Add all controls
            this.Controls.Add(statusLabel);
            this.Controls.Add(progressBar);
            this.Controls.Add(cbLaunch);
            this.Controls.Add(cbStartMenu);
            this.Controls.Add(cbDesktop);
            this.Controls.Add(pathInfoLabel);
            this.Controls.Add(pathPanel);
            this.Controls.Add(descLabel);
            this.Controls.Add(welcomeLabel);
            this.Controls.Add(headerPanel);
            this.Controls.Add(footerPanel);

            this.ResumeLayout(false);
            this.PerformLayout();
        }

        private void BtnInstall_Click(object sender, EventArgs e)
        {
            if (isInstalled)
            {
                if (cbLaunch.Checked)
                {
                    string launcherPath = Path.Combine(installDir, "DC-Excel.exe");
                    if (File.Exists(launcherPath))
                    {
                        Process.Start(new ProcessStartInfo
                        {
                            FileName = launcherPath,
                            UseShellExecute = true
                        });
                    }
                }
                this.Close();
                return;
            }

            // Disable controls
            btnInstall.Enabled = false;
            btnCancel.Enabled = false;
            cbDesktop.Enabled = false;
            cbStartMenu.Enabled = false;
            cbLaunch.Enabled = false;

            progressBar.Visible = true;
            progressBar.Value = 10;
            statusLabel.Visible = true;
            statusLabel.Text = "Preparing installation directory...";

            Thread worker = new Thread(() =>
            {
                try
                {
                    // 1. Create install dir
                    Thread.Sleep(300);
                    if (!Directory.Exists(installDir))
                    {
                        Directory.CreateDirectory(installDir);
                    }

                    UpdateProgress(25, "Extracting application launcher and assets...");
                    Thread.Sleep(300);

                    // 2. Extract embedded resources
                    ExtractResource("Launcher", Path.Combine(installDir, "DC-Excel.exe"));
                    ExtractResource("Uninstaller", Path.Combine(installDir, "Uninstall.exe"));
                    ExtractResource("Icon", Path.Combine(installDir, "favicon.ico"));

                    UpdateProgress(55, "Configuring Windows shortcuts...");
                    Thread.Sleep(300);

                    // 3. Create shortcuts via WScript.Shell
                    string launcherExe = Path.Combine(installDir, "DC-Excel.exe");
                    string iconFile = Path.Combine(installDir, "favicon.ico");

                    if (cbDesktop.Checked)
                    {
                        string desktopLink = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "DC Excel.lnk");
                        CreateShortcut(desktopLink, launcherExe, iconFile, "DC Excel by Damayanti Crest");
                    }

                    if (cbStartMenu.Checked)
                    {
                        string startFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "Damayanti Crest");
                        if (!Directory.Exists(startFolder))
                        {
                            Directory.CreateDirectory(startFolder);
                        }
                        string startLink = Path.Combine(startFolder, "DC Excel.lnk");
                        CreateShortcut(startLink, launcherExe, iconFile, "DC Excel by Damayanti Crest");
                    }

                    UpdateProgress(80, "Registering application with Windows...");
                    Thread.Sleep(300);

                    // 4. Register in Windows Registry
                    try
                    {
                        using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\DCExcel"))
                        {
                            if (key != null)
                            {
                                key.SetValue("DisplayName", "DC Excel");
                                key.SetValue("DisplayVersion", "1.0.0");
                                key.SetValue("Publisher", "Damayanti Crest");
                                key.SetValue("DisplayIcon", launcherExe + ",0");
                                key.SetValue("InstallLocation", installDir);
                                key.SetValue("UninstallString", "\"" + Path.Combine(installDir, "Uninstall.exe") + "\"");
                                key.SetValue("URLInfoAbout", "https://dc-excel.damayanticrest.online/");
                                key.SetValue("EstimatedSize", 2048, RegistryValueKind.DWord);
                            }
                        }
                    }
                    catch { }

                    UpdateProgress(100, "Installation Complete!");
                    Thread.Sleep(200);

                    this.Invoke(new Action(() =>
                    {
                        isInstalled = true;
                        btnInstall.Enabled = true;
                        btnInstall.Text = cbLaunch.Checked ? "Finish & Launch" : "Finish";
                        btnCancel.Visible = false;
                        statusLabel.Text = "DC Excel has been successfully installed!";
                        statusLabel.ForeColor = Color.FromArgb(16, 185, 129); // #10b981
                    }));
                }
                catch (Exception ex)
                {
                    this.Invoke(new Action(() =>
                    {
                        MessageBox.Show(
                            "Setup encountered an error: " + ex.Message,
                            "DC Excel Setup Error",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error
                        );
                        btnInstall.Enabled = true;
                        btnCancel.Enabled = true;
                    }));
                }
            });
            worker.IsBackground = true;
            worker.Start();
        }

        private void UpdateProgress(int percent, string status)
        {
            this.Invoke(new Action(() =>
            {
                progressBar.Value = Math.Min(100, percent);
                statusLabel.Text = status;
            }));
        }

        private void ExtractResource(string resourceName, string targetPath)
        {
            Assembly asm = Assembly.GetExecutingAssembly();
            // Look for matching resource
            foreach (string name in asm.GetManifestResourceNames())
            {
                if (name.EndsWith(resourceName) || name.Equals(resourceName, StringComparison.OrdinalIgnoreCase))
                {
                    using (Stream stream = asm.GetManifestResourceStream(name))
                    {
                        if (stream != null)
                        {
                            using (FileStream fs = new FileStream(targetPath, FileMode.Create, FileAccess.Write))
                            {
                                stream.CopyTo(fs);
                            }
                            return;
                        }
                    }
                }
            }
        }

        private void CreateShortcut(string shortcutPath, string targetPath, string iconPath, string description)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);
                    var shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = targetPath;
                    if (File.Exists(iconPath))
                    {
                        shortcut.IconLocation = iconPath + ",0";
                    }
                    shortcut.Description = description;
                    shortcut.WorkingDirectory = Path.GetDirectoryName(targetPath);
                    shortcut.Save();
                }
            }
            catch { }
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SetupForm());
        }
    }
}
