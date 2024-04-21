import {SuggestModal, App} from 'obsidian'
import {IAzureInstanceUrl} from '../Models/AzureInstanceUrl'

export class AzureInstanceSuggestModal extends SuggestModal<IAzureInstanceUrl> {
	items: IAzureInstanceUrl[]
	onSubmit: (result: IAzureInstanceUrl) => void;

	/**
	 * @private
	 */
	untitledInstanceCounter = 0;

	constructor(app: App, items: IAzureInstanceUrl[], onSubmit: (result: IAzureInstanceUrl) => void){
		super(app)
		this.items = items;
		this.onSubmit = onSubmit;
		this.inputEl.addEventListener('keydown', () => {
			this.untitledInstanceCounter = 0;
		})
	}
	getSuggestions(query: string): IAzureInstanceUrl[] | Promise<IAzureInstanceUrl[]> {
		// Create new items to ensure instance titles are filled
		const newItems = this.items.map(x => {
			return (
				{
					IsDefault: x.IsDefault,
					Url: x.Url,
					Title: x.Title === '' ? `Instance ${(this.untitledInstanceCounter++)}` : x.Title
				}
			)
		})
		
		// Filter based on input
		return newItems.filter(x => 
			x.Title.toLowerCase().contains(query.toLowerCase()) || 
			x.Url.toLowerCase().contains(query.toLowerCase())
		);
	}
	renderSuggestion(value: IAzureInstanceUrl, el: HTMLElement) {
		const div = el.createDiv()
		div.createEl('h1', {
			text: value.Title
		}).className = 'azure_instance_title'

		div.createEl('p', {
			text: value.Url
		}).className = 'azure_instance_url'
	}
	onChooseSuggestion(item: IAzureInstanceUrl, evt: KeyboardEvent | MouseEvent) {
		this.onSubmit(item);
		return item;
	}

	onClose(): void {
		const {contentEl} = this;
		contentEl.empty();
	}
}
