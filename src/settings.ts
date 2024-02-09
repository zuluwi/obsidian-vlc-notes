import { App, Notice, PluginSettingTab, Setting, MarkdownRenderer } from "obsidian";
import VLCBridgePlugin from "./main";
import { t } from "./language/helpers";
import { currentConfig } from "./vlcHelper";
import isPortReachable from "is-port-reachable";

declare module "obsidian" {
  interface DataAdapter {
    getFullRealPath(arg: string): string;
  }
}
export interface VBPluginSettings {
  port: number;
  password: string;
  snapshotPrefix: string;
  snapshotFolder: string;
  snapshotExt: "png" | "jpg" | "tiff";
  currentFile: string | null;
  vlcPath: string;
  syncplayPath: string;
  lang: string;
  normalSeek: number;
  largeSeek: number;
  alwaysOnTop: boolean;
  pauseOnPasteLink: boolean;
  pauseOnPasteSnapshot: boolean;
  usePercentagePosition: boolean;
  showSidebarIcon: boolean;
}

export const DEFAULT_SETTINGS: VBPluginSettings = {
  port: 1234,
  password: "vlcpassword",
  snapshotPrefix: "image",
  snapshotFolder: "vlcSnapshots",
  snapshotExt: "png",
  currentFile: null,
  vlcPath: "",
  syncplayPath: "",
  lang: "en",
  normalSeek: 5,
  largeSeek: 60,
  alwaysOnTop: true,
  pauseOnPasteLink: false,
  pauseOnPasteSnapshot: false,
  usePercentagePosition: false,
  showSidebarIcon: true,
};

const snapshotExts: {
  png: "png";
  jpg: "jpg";
  tiff: "tiff";
} = {
  png: "png",
  jpg: "jpg",
  tiff: "tiff",
};

export class VBPluginSettingsTab extends PluginSettingTab {
  plugin: VLCBridgePlugin;

  constructor(app: App, plugin: VLCBridgePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    // new Setting(containerEl)
    //   .setName("Setting #1")
    //   .setDesc("It's a secret")
    //   .addText((text) =>
    //     text
    //       .setPlaceholder("Enter your secret")
    //       .setValue(this.plugin.settings.mySetting)
    //       .onChange(async (value) => {
    //         this.plugin.settings.mySetting = value;
    //         await this.plugin.saveSettings();
    //       })
    //   );

    const isPortAvailable = (port: number) => {
      return new Promise<boolean>(async (resolve) => {
        var isPortInUse = await isPortReachable(port, { host: "localhost" });
        if (isPortInUse) {
          if ((port == this.plugin.settings.port || port == currentConfig.port) && (await this.plugin.checkPort())) {
            resolve(true);
          } else {
            resolve(false);
          }
        } else {
          resolve(true);
        }
      });
    };

    let copyUrlEl: Setting;
    let copyCommandEl: Setting;
    let syncplayArgEl: Setting;
    let copyArgEl: Setting;

    const splittedPath = () => {
      let dirPathArg = "--snapshot-path=" + this.plugin.app.vault.adapter.getFullRealPath(this.plugin.settings.snapshotFolder);
      return {
        1: `${dirPathArg
          .split(" ")
          .map((str) => `'${str}'`)
          .join(", ")}`,
        2: `'${dirPathArg}'`,
      };
    };

    const setCopyBtnDesc = () => {
      syncplayArgEl.setDesc(`"${this.plugin.settings.syncplayPath}" --player-path "${this.plugin.settings.vlcPath}" -- ${this.plugin.vlcExecOptions().join(" ")}`);
      copyUrlEl.setDesc(`http://:${this.plugin.settings.password}@localhost:${this.plugin.settings.port}/`);
      copyCommandEl.setDesc(`"${this.plugin.settings.vlcPath}" ${this.plugin.vlcExecOptions().join(" ")}`);

      // copyArgEl.setDesc(`${this.plugin.vlcExecOptions().join(" ").replace(/["]/g, "")}`);
      // if (/\s/.test(this.plugin.app.vault.adapter.getFullRealPath(this.plugin.settings.snapshotFolder))) {
      //   MarkdownRenderer.render(
      //     this.app,
      //     `> [!warning]\n> ${t("syncplay argument instructions").replace("#1#", splittedPath()[1]).replace("#2#", splittedPath()[2])}`,
      //     copyArgEl.descEl,
      //     "",
      //     this.plugin
      //   );
      // }

      // .createDiv()
      // .createEl("code", { text: `${splittedPath()}` });

      //
    };

    var selectVLCDescEl: HTMLElement;
    var selectVLC = new Setting(containerEl)
      .setName(t("VLC Path"))
      .setDesc(t("Select 'vlc.exe' from the folder where VLC Player is installed"))
      .addButton((btn) => {
        btn.setButtonText(t("Select vlc.exe")).onClick(() => {
          const input = document.createElement("input");
          input.setAttribute("type", "file");
          input.accept = ".exe";
          input.onchange = async (e: Event) => {
            var files = (e.target as HTMLInputElement)?.files as FileList;
            for (let i = 0; i < files.length; i++) {
              var file = files[i];

              this.plugin.settings.vlcPath = file.path;
              selectVLCDescEl.innerText = file.path;
              await this.plugin.saveSettings();
              setCopyBtnDesc();

              input.remove();
            }
          };

          input.click();
        });
      });
    selectVLCDescEl = selectVLC.descEl.createEl("div").createEl("b", { text: this.plugin.settings.vlcPath || "" });

    new Setting(containerEl)
      .setName(t("Port"))
      .setDesc(t("Enter a port number between 1 and 65535 for the server that will be opened to control VLC Player"))
      .addText(async (text) => {
        text
          .setPlaceholder(this.plugin.settings.port.toString())
          .setValue(this.plugin.settings.port.toString())
          .onChange(async (value) => {
            if (isNaN(Number(value)) || 65535 < Number(value) || 1 > Number(value)) {
              text.inputEl.style.borderColor = "red";
            } else if (!(await isPortAvailable(Number(value)))) {
              text.inputEl.style.borderColor = "red";
              new Notice(t("The port you selected is not usable, please enter another port value"));
            } else {
              text.inputEl.style.borderColor = "currentColor";
              this.plugin.settings.port = Number(value);
              await this.plugin.saveSettings();
              setCopyBtnDesc();
            }
          });
        // var portCheck = await getPort({ port: this.plugin.settings.port });

        if (!(await isPortAvailable(this.plugin.settings.port))) {
          text.inputEl.style.borderColor = "red";
          new Notice(t("The port you selected is not usable, please enter another port value"));
        }
      });

    new Setting(containerEl).setName(t("Always show VLC Player on top")).addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.alwaysOnTop).onChange(async (value) => {
        this.plugin.settings.alwaysOnTop = value;
        await this.plugin.saveSettings();
        setCopyBtnDesc();
      });
    });
    new Setting(containerEl).setName(t("Pause video while pasting timestamp")).addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.pauseOnPasteLink).onChange((value) => {
        this.plugin.settings.pauseOnPasteLink = value;
        this.plugin.saveSettings();
      });
    });
    new Setting(containerEl).setName(t("Pause video while pasting snapshot")).addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.pauseOnPasteSnapshot).onChange((value) => {
        this.plugin.settings.pauseOnPasteSnapshot = value;
        this.plugin.saveSettings();
      });
    });
    new Setting(containerEl)
      .setName(t("Use percentile position instead of seconds as timestamp value in the link"))
      .setDesc(
        t("Allows you to open more precise (sub-second) time values. It is recommended to enable this option if you want to open exactly the same frame as when you get the link.")
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.usePercentagePosition).onChange((value) => {
          this.plugin.settings.usePercentagePosition = value;
          this.plugin.saveSettings();
        });
      });
    new Setting(containerEl).setName(t("Show 'open video' icon in the sidebar")).addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.showSidebarIcon).onChange(async (value) => {
        this.plugin.settings.showSidebarIcon = value;
        await this.plugin.saveSettings();
        this.plugin.setSidebarIcon();
      });
    });

    containerEl.createEl("h1", { text: t("Seeking Amounts") });

    new Setting(containerEl)
      .setName(t("Normal Seek Amount (in seconds)"))
      .setDesc(t("Set the seek amount for 'Seek forward/backward' commands"))
      .addSlider((slider) => {
        slider
          .setLimits(1, 60, 1)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.normalSeek)
          .onChange((value) => {
            this.plugin.settings.normalSeek = value;
            this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t("Long Seek Amount (in seconds)"))
      .setDesc(t("Set the seek amount for 'Long seek forward/backward' commands"))
      .addSlider((slider) => {
        slider
          .setLimits(5, 10 * 60, 5)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.largeSeek)
          .onChange((value) => {
            this.plugin.settings.largeSeek = value;
            this.plugin.saveSettings();
          });
      });

    containerEl.createEl("h1", { text: t("Snapshot") });

    var folderNamePattern = /^[A-Za-z0-9][^\\\/\<\>\"\*\:\|\?]*$/gi;
    new Setting(containerEl)
      .setName(t("Snapshot folder"))
      .setDesc(t("Enter the folder name where snapshots will be saved in the vault"))
      .setTooltip(t("Select a valid file name"))
      .addText((text) =>
        text
          .setPlaceholder(this.plugin.settings.snapshotFolder)
          .setValue(this.plugin.settings.snapshotFolder)
          .onChange(async (value) => {
            if (!value.match(folderNamePattern)) {
              text.inputEl.style.borderColor = "red";
            } else {
              text.inputEl.style.borderColor = "currentColor";
              if (await this.plugin.app.vault.adapter.exists(this.plugin.settings.snapshotFolder)) {
                this.plugin.app.vault.adapter.rename(this.plugin.settings.snapshotFolder, value);
              } else {
                this.plugin.app.vault.adapter.mkdir(value);
              }
              this.plugin.settings.snapshotFolder = value;
              await this.plugin.saveSettings();
              setCopyBtnDesc();
            }
          })
      );

    new Setting(containerEl)
      .setName(t("Snapshot Format"))
      .setDesc(t("Select the image format in which the snapshots will be saved"))
      .addDropdown((menu) => {
        menu
          .addOptions(snapshotExts)
          .setValue(snapshotExts[this.plugin.settings.snapshotExt])
          .onChange(async (value: "png" | "jpg" | "tiff") => {
            this.plugin.settings.snapshotExt = value;
            await this.plugin.saveSettings();
            setCopyBtnDesc();
          });
      });

    containerEl.createEl("h1", { text: "Syncplay" });

    var selectSPDescEl: HTMLElement;
    var selectSP = new Setting(containerEl)
      .setName(t("Syncplay Path"))
      .setDesc(t("Select 'Syncplay.exe' from the folder where Syncplay is installed"))
      .addButton((btn) => {
        btn
          .setButtonText(t("Select Syncplay.exe"))

          .onClick(() => {
            const input = document.createElement("input");
            input.setAttribute("type", "file");
            input.accept = ".exe";
            input.onchange = async (e: Event) => {
              var files = (e.target as HTMLInputElement)?.files as FileList;
              for (let i = 0; i < files.length; i++) {
                var file = files[i];

                this.plugin.settings.syncplayPath = file.path;
                selectSPDescEl.innerText = file.path;
                await this.plugin.saveSettings();
                setCopyBtnDesc();

                input.remove();
              }
            };

            input.click();
          });
      });
    selectSPDescEl = selectSP.descEl.createEl("div").createEl("b", { text: this.plugin.settings.syncplayPath || "" });

    syncplayArgEl = new Setting(containerEl).setName(t("Start Syncplay with plugin arguments")).addButton((btn) =>
      btn.setButtonText(t("Start Syncplay")).onClick(async () => {
        this.plugin.launchSyncplay();
      })
    );

    containerEl.createEl("h1", { text: t("Extra") });

    copyUrlEl = new Setting(containerEl).setName(t("Copy VLC Web Interface link")).addButton((btn) =>
      btn.setButtonText(t("Copy to clipboard")).onClick(async () => {
        if (await isPortAvailable(this.plugin.settings.port)) {
          await navigator.clipboard.writeText(`http://:${this.plugin.settings.password}@localhost:${this.plugin.settings.port}/`);
          new Notice(t("Copied to clipboard"));
        } else {
          new Notice(t("The port you selected is not usable, please enter another port value"));
        }
      })
    );
    copyCommandEl = new Setting(containerEl).setName(t("Copy command line code")).addButton((btn) =>
      btn.setButtonText(t("Copy to clipboard")).onClick(async () => {
        if (await isPortAvailable(this.plugin.settings.port)) {
          await navigator.clipboard.writeText(`"${this.plugin.settings.vlcPath}" ${this.plugin.vlcExecOptions().join(" ")}`);
          new Notice(t("Copied to clipboard"));
        } else {
          new Notice(t("The port you selected is not usable, please enter another port value"));
        }
      })
    );
    // copyArgEl = new Setting(containerEl).setName(t("Copy arguments for starting VLC (for Syncplay)")).addButton((btn) =>
    //   btn.setButtonText(t("Copy to clipboard")).onClick(async () => {
    //     if (await isPortAvailable(this.plugin.settings.port)) {
    //       // await navigator.clipboard.writeText(`${this.plugin.vlcExecOptions().join(" ").trim().replace(/["]/g, "")}`);
    //       await navigator.clipboard.writeText(`${this.plugin.vlcExecOptions().join(" ").trim()}`);
    //       new Notice(t("Copied to clipboard"));
    //     } else {
    //       new Notice(t("The port you selected is not usable, please enter another port value"));
    //     }
    //   })
    // );
    setCopyBtnDesc();

    //
  }
}
