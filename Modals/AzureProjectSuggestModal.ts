import { SuggestModal, App } from "obsidian";
import { IAzureProject } from "Models/AzureProject";

export class AzureProjectSuggestModal extends SuggestModal<IAzureProject> {
	items: IAzureProject[]
	onSubmit: (result: IAzureProject) => void;

	untitledProjectCounter = 0;

	constructor(app: App, items: IAzureProject[], onSubmit: (result: IAzureProject) => void){
		super(app)
		this.items = items;
		this.onSubmit = onSubmit;
		this.inputEl.addEventListener('keydown', () => {
			this.untitledProjectCounter = 0;
		})
	}
	getSuggestions(query: string): IAzureProject[] | Promise<IAzureProject[]> {
		// Create new items to ensure project titles are filled
		const newItems = this.items.map(x => {
			return (
				{
					Name: x.Name,
					Abbreviation: x.Abbreviation
				}
			)
		})

		// Filter based on input
		return newItems.filter(x =>
			x.Name.toLowerCase().contains(query.toLowerCase()) || 
			x.Abbreviation.toLowerCase().contains(query.toLowerCase())
		)
	}
	renderSuggestion(value: IAzureProject, el: HTMLElement) {
		const div = el.createDiv()
		div.createEl('h1', {
			text: value.Name
		}).className = 'azure_project_name'

		div.createEl('p', {
			text: value.Abbreviation
		}).className = 'azure_project_abbrev'
	}
	onChooseSuggestion(item: IAzureProject, evt: MouseEvent | KeyboardEvent) {
		this.onSubmit(item);
		return item;
	}
	onClose(): void {
		const {contentEl} = this;
		contentEl.empty();
	}
}
