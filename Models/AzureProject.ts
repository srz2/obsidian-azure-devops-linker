export interface IAzureProject {
	Name: string,
	Abbreviation: string
}

export class AzureProject implements IAzureProject {
	Name: string;
	Abbreviation: string;
	
	constructor(name: string, abbreviation: string) {
		this.Name = name ? name : "";
		this.Abbreviation = abbreviation;
	}
}
