(function( $, undefined ) {
	$.KBWidget({
		name: "KBaseGWASSummaryPop",
	parent: "kbaseWidget",
	version: "1.0.0",
	//width: 600,
	options: {
		width: 400,
	type: "KBaseGwasData.GwasSummaryPopulation"
	},
	workspaceURL: "https://kbase.us/services/ws",

	init: function(options) {
		this._super(options);

		var self = this;

		this.workspaceClient = new Workspace(this.workspaceURL);

		this.workspaceClient.get_objects([{name : this.options.id, workspace: this.options.ws}], 
				function(data){
					var id = data[0].data.gwasPopulations[0].populationId;

					self.workspaceClient.get_objects([{name : id, workspace: self.options.ws}], 
						function(data2) {
							self.collection = data2[0];
							self.$elem.append($("<div/>").
								append($("<table/>").addClass("kbgo-table")
									.append($("<tr/>").append("<td>ID</td><td>" + self.collection.data.genome.kbase_genome_id + "</td>"))
									.append($("<tr/>").append("<td>Name</td><td>" + self.collection.data.genome.kbase_genome_name + "</td>"))
									.append($("<tr/>").append("<td>Source</td><td>" + self.collection.data.genome.source + "</td>"))
									.append($("<tr/>").append("<td>Source Name</td><td>" + self.collection.data.genome.source_genome_name + "</td>"))
									.append($("<tr/>").append("<td>Description</td><td>" + self.collection.data.GwasPopulation_description + "</td>"))
									));

						}, self.rpcError);	
				}, self.rpcError );	
		return this;
	},
	getData: function() {
						 return {
							 type:this.options.type,
							 id: this.options.id,
							 workspace: this.options.ws,
							 title: "GWAS Summary Population Details"
						 };
					 }
	});
})( jQuery )
