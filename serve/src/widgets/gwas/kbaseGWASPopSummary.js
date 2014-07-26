(function( $, undefined ) {
    $.KBWidget({
        name: "KBaseGWASPopSummary",
        parent: "kbaseWidget",
        version: "1.0.0",
        //width: auto,
        options: {
            width: "auto",
            type: "KBaseGwasData.GwasPopulationSummary"
        },
        workspaceURL: "https://kbase.us/services/ws",

        init: function(options) {
            this._super(options);

            var self = this;

            this.workspaceClient = new Workspace(this.workspaceURL);

            this.workspaceClient.get_objects([{name : this.options.id, workspace: this.options.ws}], 
                function(data){
                    self.collection = data[0];

                    var mainContent = $("<table/>").addClass("table table-bordered table-striped").attr("id", "popTable");                        

                    var innerHTML = '';

					alert(innerHTML);

                    mainContent.html(innerHTML);

                    self.$elem.append(mainContent);


                },

                self.rpcError
            );

            return this;
        },
        getData: function() {
            return {
                type:this.options.type,
                id: this.options.id,
                workspace: this.options.ws,
                title: "GWAS Population Summary"
            };
        }
    });
})( jQuery )
