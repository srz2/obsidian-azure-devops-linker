import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import {AzureInstanceSuggestModal} from 'Modals/AzureInstanceSuggestModal'
import { AzureIssueInputModal } from 'Modals/AzureIssueInputModal';
import { IAzureInstanceUrl } from 'Models/AzureInstanceUrl';
import { IAzureProject } from 'Models/AzureProject';
import { AzureProjectSuggestModal } from 'Modals/AzureProjectSuggestModal';

interface LocalSettings {
	azure_instance_urls: IAzureInstanceUrl[];
	azure_projects: IAzureProject[];
	local_issue_path: string;
	local_issue_info_file: string;
	input_modal_settings: {
		insert_newline_after_return: boolean;
	}
}

const DEFAULT_SETTINGS: LocalSettings = {
	azure_instance_urls: [],
	azure_projects: [],
	local_issue_path: '',
	local_issue_info_file: '_Info',
	input_modal_settings: {
		insert_newline_after_return: true
	}
}

export default class AzureLinkerPlugin extends Plugin {
	settings: LocalSettings;

	async onload() {
		await this.loadSettings();

		// This adds an editor command that can link a Azure issue to the local Azure instance
		this.addCommand({
			id: 'cmd-link-azure-issue',
			name: 'Link Azure DevOps issue',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				if (this.settings.azure_instance_urls.length > 1) {
					// Get suggestion
					const suggestor = new AzureInstanceSuggestModal(this.app, this.settings.azure_instance_urls, (instance) => {
						this.insertAzureLink(instance.Url, editor)
					})
					suggestor.setPlaceholder('Select a Azure DevOps instance')
					suggestor.open()
				} else {
					const instanceUrl = this.settings.azure_instance_urls.length == 0 ? "" : this.settings.azure_instance_urls[0].Url;
					this.insertAzureLink(instanceUrl, editor);
				}
			}
		});

		// This adds an editor command that can link a Azure issue to the local Azure instance
		this.addCommand({
			id: 'cmd-link-azure-issue-default-instance',
			name: 'Link Azure DevOps issue (default instance)',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				// Check if no instances exists
				if (this.settings.azure_instance_urls.length == 0) {
					this.insertAzureLink("", editor);
				} else {
					// Find the default instance
					let foundIndex = -1;
					const defaultInstance = this.settings.azure_instance_urls.find((x, index, instance) => {
						// Record index if found
						const condition = x.IsDefault
						if (condition){
							foundIndex = index
						}
						return condition
					})
					// If no defeault instance found, use the first listed instance
					?? this.settings.azure_instance_urls[0];					

					// If no default is found, alert the user
					if (foundIndex == -1){
						new Notice(`No default Azure Instance configured, using the first instance available: ${
																												this.settings.azure_instance_urls[0].Title !== "" ?
																												this.settings.azure_instance_urls[0].Title :
																												this.settings.azure_instance_urls[0].Url
																											}`)
					}

					// Execute the Azure Link on the default instance
					this.insertAzureLink(defaultInstance.Url, editor)
				}
			}
		});

		// This adds an editor command that can link a Azure issue to a local issue _Info page
		this.addCommand({
			id: 'cmd-link-Azure-issue-info',
			name: 'Link Azure DevOps issue to info',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const local_issue_path = this.settings.local_issue_path;
				const local_issue_main_file = this.settings.local_issue_info_file;
				const content = editor.getSelection();

				// Check local issue path
				if (local_issue_path == ''){
					const msg = 'The local issue path has not been set in settings'
					new Notice(msg)
					return;
				}

				// Check local issue main file
				if (local_issue_main_file == ''){
					const msg = 'The local issue main file has not been set in settings'
					new Notice(msg)
					return;
				}

				if (content == ''){
					new AzureIssueInputModal(this.app, this.settings.input_modal_settings.insert_newline_after_return, (result) => {
						if (result !== ''){
							const newStr = this.createLocalUri(local_issue_path, result, local_issue_main_file)
							editor.replaceSelection(newStr);
						}
					})
					.setDescription('Enter an issue number to be constructed into your local issue path')
					.open();
				} else {
					// Replace content with local _Issue relative path
					const newStr = this.createLocalUri(local_issue_path, content, local_issue_main_file)
					editor.replaceSelection(newStr);
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new AzureLinkerSettingTab(this.app, this));
	}

	insertAzureLink(azure_url: string, editor: Editor){
		// Check Azure URL
		if (azure_url == ''){
			const msg = 'The Azure URL has not been set in settings'
			new Notice(msg)
			return;
		}

		const content = editor.getSelection();

		// Check for content, ask for it if not selected
		if (content == ''){
			new AzureIssueInputModal(this.app, this.settings.input_modal_settings.insert_newline_after_return, (result) => {
				if (result !== ''){
					const newStr = this.createWebUrl(azure_url, result)
					editor.replaceSelection(newStr);
				}
			})
			.setDescription('Enter an issue number which will then be appended to your Azure instance url')
			.open();
		} else {
			const newStr = this.createWebUrl(azure_url, content)
			editor.replaceSelection(newStr);
		}
	}

	/**
	 * Create a URL for linking to Azure web instance
	 * @param {string} azure_url The Azure instance url
	 * @param {string} project_name The project name for the given instance
	 * @param {string} azure_issue The Azure issue number (e.g.: AZURE-123)
	 * @returns {string} A fully formed markdown Url representing a Azure with the issue as a label
	 */
	createWebUrl(azure_url: string, project_name: string, azure_issue: string): string {
		//TODO Make project name HTML Safe
		const htmlsafe_project_name = project_name;

		return `[${azure_issue}](${azure_url}/${htmlsafe_project_name}/${azure_issue})`
	}

	/**
	 * Create a Uri which points to a local file
	 * @param {string} local_path The local path for the local issues in obsidian
	 * @param {string} azure_issue The AZURE issue number (e.g.: AZURE-123)
	 * @param {string} main_file_name The name of the main file
	 * @returns {string} A fully formed obsidian markdown Uri for referencing an issue
	 */
	createLocalUri(local_path: string, azure_issue: string, main_file_name: string) : string {
		return `[[${local_path}/${azure_issue}/${main_file_name}|${azure_issue}]]`
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class AzureLinkerSettingTab extends PluginSettingTab {
	plugin: AzureLinkerPlugin;

	constructor(app: App, plugin: AzureLinkerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		this.add_azure_instance_settings(containerEl);
		this.add_azure_project_settings(containerEl);
		this.add_azure_local_issue_settings(containerEl);
		this.add_misc_settings(containerEl);
	}

	add_azure_instance_settings(containerEl : HTMLElement) {

		const desc = document.createDocumentFragment();
		const content = document.createElement('div')
		content.innerHTML = `
		<p>The list of domain URLs for your Azure instances</p>
		<p>Denote your default instance by selecting the <strong>Set As Default</strong> button. If <span style="text-decoration: underline;">no default is selected</span>, the <strong>first</strong> instance will be used</p>
		</br>
		<em>Note: A title is optional for your instances, but recommended for organization.</em>
		`
		desc.append(content)

		new Setting(containerEl)
			.setName('Azure DevOps Instances')
			.setDesc(desc)

		this.plugin.settings.azure_instance_urls.forEach((url, index) => {
			const s = new Setting(containerEl);
			
			// Remove the name and description since we aren't using them. This
			// plus the css class `.setting-item-info:empty` will get us more space
			s.nameEl.remove();
			s.descEl.remove();

				// Conditionally add Default button
				if (!this.plugin.settings.azure_instance_urls[index].IsDefault){
					s.addButton((cb) => {
						cb.setButtonText("Set As Default")
						cb.onClick(cb => {
							for (let c = 0; c < this.plugin.settings.azure_instance_urls.length; c++){
								this.plugin.settings.azure_instance_urls[c].IsDefault = false;
							}
							this.plugin.settings.azure_instance_urls[index].IsDefault = true;
							this.plugin.saveSettings();
							this.display();
						})
					})
				} else {
					s.addButton((cb) => {
						cb.setButtonText('Default')
						cb.buttonEl.className = 'assigned-default-button';
						cb.onClick(cb => {
							this.plugin.settings.azure_instance_urls[index].IsDefault = false;
							this.plugin.saveSettings();
							this.display();
						})
					})
				}

				s.addText((cb) => {
					cb.setPlaceholder('Add an optional title')
					cb.setValue(this.plugin.settings.azure_instance_urls[index].Title)
					cb.onChange(async (value) => {
						this.plugin.settings.azure_instance_urls[index].Title = value
						await this.plugin.saveSettings();
					})
				})
				.addText((cb) => {
					cb.setPlaceholder('Example: https://dev.azure.com/orgName')
					cb.setValue(this.plugin.settings.azure_instance_urls[index].Url);
					cb.onChange(async (value) => {
						if (value.endsWith('/')) {
							value = value.slice(0, -1);
						}
						this.plugin.settings.azure_instance_urls[index].Url = value
						await this.plugin.saveSettings();
					})
					cb.inputEl.classList.add("setting_azure_instance_url")
				})
				.addExtraButton((cb) => {
					cb.setIcon('cross')
						.setTooltip('delete instance')
						.onClick(async () => {
							this.plugin.settings.azure_instance_urls.splice(index, 1);
							await this.plugin.saveSettings();
							// Force refresh display
							this.display();
						})
				})
		})
		
		new Setting(containerEl).addButton((cb) => {
			cb.setButtonText("Add new Azure DevOps instance")
				.setCta()
				.onClick(async () => {
					this.plugin.settings.azure_instance_urls.push({
						Title: '',
						IsDefault: false,
						Url: ''
					});
					await this.plugin.saveSettings();
					// // Force refresh
					this.display();
				});
		});
	}

	add_azure_project_settings(containerEl : HTMLElement) {

		const desc = document.createDocumentFragment();
		const content = document.createElement('div')
		content.innerHTML = `
		<p>The list of Projects and Abbreviations for your Azure instances</p>
		<p>Issues for different projects are shortened to use abbreviations to make the Obsidian notes more concise</p>
		`
		desc.append(content)

		new Setting(containerEl)
			.setName('Azure DevOps Abbreviations')
			.setDesc(desc)

		this.plugin.settings.azure_projects.forEach((project, index) => {
			const s = new Setting(containerEl);
			
			// Remove the name and description since we aren't using them. This
			// plus the css class `.setting-item-info:empty` will get us more space
			s.nameEl.remove();
			s.descEl.remove();

				s.addText((cb) => {
					cb.setPlaceholder('Add an Project Name')
					cb.setValue(this.plugin.settings.azure_projects[index].Name)
					cb.onChange(async (value) => {
						this.plugin.settings.azure_projects[index].Name = value
						await this.plugin.saveSettings();
					})
					cb.inputEl.classList.add("setting_azure_projects_name")
				})
				.addText((cb) => {
					cb.setPlaceholder('Example: Project Abbreviation')
					cb.setValue(this.plugin.settings.azure_projects[index].Abbreviation);
					cb.onChange(async (value) => {
						this.plugin.settings.azure_projects[index].Abbreviation = value
						await this.plugin.saveSettings();
					})
					cb.inputEl.classList.add("setting_azure_projects_abbrev")
				})
				.addExtraButton((cb) => {
					cb.setIcon('cross')
						.setTooltip('delete Project')
						.onClick(async () => {
							this.plugin.settings.azure_projects.splice(index, 1);
							await this.plugin.saveSettings();
							// Force refresh display
							this.display();
						})
				})
		})
		
		new Setting(containerEl).addButton((cb) => {
			cb.setButtonText("Add new Azure project")
				.setCta()
				.onClick(async () => {
					this.plugin.settings.azure_projects.push({
						Name: '',
						Abbreviation: ''
					});
					await this.plugin.saveSettings();
					// Force refresh
					this.display();
				});
		});
	}
	

	add_azure_local_issue_settings(containerEl: HTMLElement) : void {
		new Setting(containerEl)
			.setName('Local Issue Path')
			.setDesc('The relative path to your issue folder')
			.addText(text => text
				.setPlaceholder('Relative issue path')
				.setValue(this.plugin.settings.local_issue_path)
				.onChange(async (value) => {
					if (value.endsWith('/')) {
						value = value.slice(0, -1);
					}
					this.plugin.settings.local_issue_path = value;
					await this.plugin.saveSettings();
				}));

		// Create description for "Local Issue Main File Name" Setting
		const settingMainFileNameDesc = document.createDocumentFragment();
		settingMainFileNameDesc.append(
			'The "Main" file name for linking to local issues (e.g.: ',
			settingMainFileNameDesc.createEl('i', {
				text: 'issues/AZURE-123/_Info'
			}),
			')'
		)
		new Setting(containerEl)
				.setName('Local Issue Main File Name')
				.setDesc(settingMainFileNameDesc)
				.addText(text => text
					.setPlaceholder('Local Issue Main File')
					.setValue(this.plugin.settings.local_issue_info_file)
					.onChange(async (value) => {
						this.plugin.settings.local_issue_info_file = value;
						await this.plugin.saveSettings();
					}));
	}

	add_misc_settings(containerEl: HTMLElement): void {

		// New Line Insertion
		new Setting(containerEl)
			.setName('New Line Insertion')
			.setDesc('Allow New Line After Pressing \'Return\' on Azure Issue Insertion')
			.addToggle(newValue => newValue
				.setValue(this.plugin.settings.input_modal_settings.insert_newline_after_return)
				.onChange(async (value) => {
					this.plugin.settings.input_modal_settings.insert_newline_after_return = value;
					await this.plugin.saveSettings();
				}))
	}
}
