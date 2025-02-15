import { App, Modal, Setting } from "obsidian";

export class AzureIssueInputModal extends Modal {
	title: string;
	description: string;
	insert_newline_on_return: boolean;
	result: string;
	onSubmit: (result: string) => void;

	constructor(app: App, insert_newline_on_return: boolean, onSubmit: (result: string) => void) {
		super(app);
		this.title = 'Enter your Azure issue';
		this.description = 'Type in an Azure DevOps issue number';
		this.insert_newline_on_return = insert_newline_on_return;
		this.onSubmit = onSubmit;
		this.containerEl.addEventListener('keydown', (e) =>{
			if (e.key === 'Enter') {
				if (this.result !== undefined && this.result !== ''){
					if (!insert_newline_on_return){
						e.preventDefault();
					}
					this.close();
					this.onSubmit(this.result);
				}
			} else if (e.key == 'Escape') {
				this.close();
			}
		});
	}

	setTitle(newTitle: string): AzureIssueInputModal {
		this.title = newTitle;
		return this;
	}

	setDescription(newDescription: string): AzureIssueInputModal {
		this.description = newDescription;
		return this;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h1", { text: this.title });
		contentEl.createEl("p", {text: this.description})

		new Setting(contentEl)
		.setName("Azure DevOps issue")
		.addText((text) =>
			text.onChange((value) => {
			this.result = value
			}));

		new Setting(contentEl)
		.addButton((btn) =>
			btn
			.setButtonText("Link issue")
			.setCta()
			.onClick(() => {
				this.close();
				this.onSubmit(this.result);
			}));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
