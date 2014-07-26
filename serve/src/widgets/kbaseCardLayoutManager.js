/**
 * This is designed to work in the context of the landing page.
 * This initializes all card positions relative to the #app div.
 *
 * It manages all cards and widgets, organizes which data is available,
 * and (with available handlers) exports data to the user's workspace.
 *
 * For the purposes of the SAC demo, the user can only export to the default
 * username_home workspace. This might change later, dependent on input
 * from the UI and UX teams.
 *
 */
(function( $, undefined ) {
    $.KBWidget({
        name: "KBaseCardLayoutManager",
        parent: "kbaseAuthenticatedWidget",
        version: "1.0.0",
        options: {
            template: null,
            data: {},
            auth: null,
            userId: null,
            loadingImage: "./assets/images/ajax-loader.gif",
        },
        cardIndex: 0,
        cards: {},
        cdmWorkspace: "CDS",
        defaultWidth: 300,

        fbaURL: "https://www.kbase.us/services/fba_model_services",
        workspaceURL: "https://kbase.us/services/ws",
        workspaceClient: null,
        fbaClient: null,        // used to export CDS genomes to workspace.

        /**
         * Initializes this widget
         */
        init: function(options) {
            this._super(options);

            $.data(this.$elem[0], "KBaseCardLayoutManager", true);
            this.fbaClient = new fbaModelServices(this.fbaURL);

            $.ui.dialog.prototype._makeDraggable = function() {
                this.uiDialog.draggable({
                    cancel: ".ui-dialog-content, .ui-dialog-titlebar-close",
                    handle: ".ui-dialog-titlebar",
                    containment: false
                });
            };

            // Allows html in dialog title bar
            // This is safe here, since these title bars are not user-generated or modified.
            // http://stackoverflow.com/questions/14488774/using-html-in-a-dialogs-title-in-jquery-ui-1-10
            $.widget("ui.dialog", $.extend({}, $.ui.dialog.prototype, {
                _title: function(title) {
                    if (!this.options.title ) {
                        title.html("&#160;");
                    } else {
                        title.html(this.options.title);
                    }
                }
            }));

            var self = this;
            $(document).on("kbaseCardClosed", function(event, id) {
                self.cardClosed(id);
            });
            console.log(this.options);

            this.render();
            this.registerEvents();
            this.showInitialCards();
            return this;
        },

        reInit: function(options) {
            console.log('reiniting card manager');
            console.log(this.options);
            for (var opt in options) {
                this.options[opt] = options[opt];
            }
            console.log(this.options);
            this.closeAllCards();
            this.showInitialCards();

        },

        loggedInCallback: function(event, auth) {
            this.options.auth = auth.token;
            this.options.userId = auth.user_id;
            this.wsClient = new Workspace(this.workspaceURL, auth);
            this.refreshWorkspaceSelector();
        },

        loggedOutCallback: function(event, auth) {
            this.options.auth = null;
            this.options.userId = null;
            this.wsClient = null;
            this.refreshWorkspaceSelector();
        },

        /**
         * Renders the control box panel.
         */
        render: function(options) {
            this.initControlBox();
            $("#app").append(this.$controlBox);

            this.initExportModal();
            this.refreshWorkspaceSelector();
            this.$elem.append(this.exportModal.modal);

            return this;
        },

        initUnderConstructionModal: function() {
            var $modal = $("<div class='modal fade'>")
                         .append($("<div class='modal-dialog'>")
                                 .append($("<div class='modal-content'>")
                                         .append($("<div class='modal-header'>")
                                                 .append($("<h4 class='modal-title'>Under Construction</h4>"))
                                                )
                                         .append($("<div class='modal-body'>")
                                                 .append($("<div class='row '>")
                                                         .append($("<div class='col-md-1 alert alert-warning'><span class='glyphicon glyphicon-warning-sign' style='font-size:16pt'></span></div>"))
                                                         .append($("<div class='col-md-11'> Sorry, exporting from these data pages to your workspace is currently unavailable. Please use the <a href='/functional-site/#/ws/' class='alert-link'>Workspace Browser</a> or the Search page.</div>"))))
                                         .append($("<div class='modal-footer'>")
                                                 .append($("<button type='button' class='btn btn-primary' data-dismiss='modal'>OK</button>"))
                                                 )
                                         )
                                 );
            return $modal;
        },

        /**
         * Initializes the modal dialog that appears when a user tries to export data to their workspace.
         * TODO: make this less full of sloppy html, and more jQuery-ish.
         *
         * It creates and stores a few accessible nodes in this.exportModal:
         *   modal: the modal itself. can be shown with exportModal.modal.modal('show')
         *   body: the body content of the modal - so it can be modified by the exporter method.
         *   okButton: exported so it can be rebound to save user-selected data.
         *   loadingDiv: exported so it can be readily added/removed from the modal body.
         */
        initExportModal: function() {
            var $okButton = $("<button type='button' class='btn btn-primary'>Export</button>");
            var $wsSelector = $("<select>")
                              .addClass("form-control select-ws");
            var $validWsDataBody = $("<form>")
                                   .addClass("form-horizontal")
                                   .attr("role", "form")
                                   .append($("<div>")
                                           .addClass("form-group")
                                           .append($("<label>")
                                                   .addClass("col-sm-5 control-label")
                                                   .append("Destination Workspace"))
                                           .append($("<div>")
                                                   .addClass("col-sm-5")
                                                   .append($wsSelector)));
            var $errorBody = $("<div>")
                             .addClass("alert alert-danger");
            var $modal = $("<div class='modal fade'>")
                         .append($("<div class='modal-dialog'>")
                                 .append($("<div class='modal-content'>")
                                         .append($("<div class='modal-header'>")
                                                 .append($("<h4 class='modal-title'>Export data?</h4>"))
                                                )
                                         .append($("<div class='modal-body'></div>")
                                                 .append($validWsDataBody.hide())
                                                 .append($errorBody.hide())
                                                )
                                         .append($("<div class='modal-footer'>")
                                                 .append($("<button type='button' class='btn btn-default' data-dismiss='modal'>Cancel</button>"))
                                                 .append($okButton)
                                                 )
                                         )
                                 );

            var $loadingDiv = $("<div style='width: 100%; text-align: center; padding: 20px'><img src='" + this.options.loadingImage + "'/><br/>Exporting data. This may take a moment...</div>");

            var exportModal = {
                modal: this.initUnderConstructionModal(), //$modal,
                okButton: $okButton,
                loadingDiv: $loadingDiv,
                wsSelector: $wsSelector,
                errorBody: $errorBody,
                wsDataBody: $validWsDataBody,
            };

            this.exportModal = exportModal;
        },

        /**
         * Refreshes the workspace selector.
         * @private
         */
        refreshWorkspaceSelector: function() {
            if (!this.exportModal || !this.exportModal.wsSelector) {
                return;
            }
            else if (!this.options.auth || !this.options.userId) {
                this.exportModal.wsSelector.empty().append("<option>Not logged in!</option>");
                return;
            }
            else {
                this.wsClient.list_workspace_info({"perm" : "w"}, 
                    $.proxy(function(wsList) {
                        wsList = wsList.sort(function(a, b) {
                            return (a[1] < b[1]) ? -1 : ( a[1] > b[1] ? 1 : 0 );
                        });
                        this.exportModal.wsSelector.empty();
                        for (var i=0; i<wsList.length; i++) {
                            this.exportModal.wsSelector.append($("<option>")
                                                               .attr("value", wsList[i][0])
                                                               .append(wsList[i][1]));
                        }
                    }, this),

                    $.proxy(function(error) {
                        this.dbg("ERROR WHILE FETCHING WRITEABLE WORKSPACE LIST!");
                        this.dbg(error);
                        this.exportModal.wsSelector.empty()
                                                   .append("<option value='" + this.options.userId + ":home'>" + this.options.userId + ":home</option>");
                    }, this));
            }
        },

        /**
         * Initializes the control panel menu that sits in the upper-right corner.
         * Currently only has one working function - show the data manager.
         *
         * Soon, there'll be a way to save and load the card layouts.
         */
        initControlBox: function() {
            var self = this;
            var makeMenuItem = function(text, action) {
                var $item = $("<li />")
                            .attr("role", "presentation")
                            .append($("<a />")
                                    .attr("role", "menuitem")
                                    .attr("tabindex", "-1")
                                    .append(text)
                                    .on("click", $.proxy(self, action) )
                                    );
                return $item;
            };


            var $dropdown = $("<div/>")
                            .addClass("dropdown")
                            .addClass("pull-right")
                            .append($("<button>")
                                    .attr("data-toggle", "dropdown")
                                    .addClass("btn btn-primary")
                                    .append("<span class='glyphicon glyphicon-cog'/> <span class='caret'></span>")
                                    )
                            .append($("<ul>")
                                    .addClass("dropdown-menu pull-right")
                                    .attr("role", "menu")
                                    .attr("aria-labelledby", "dLabel")
                                    .append(makeMenuItem("Manage Data", "toggleDataManager"))
                                    .append(makeMenuItem("Save Layout", "saveLayout").addClass("disabled"))
                                    .append(makeMenuItem("Load Layout", "loadLayout").addClass("disabled"))
                                    );

            this.$dataManager = this.makeDataManager();

            this.$dataManager.hide();

            this.$controlBox = $("<div class='container'/>")
                               .addClass("kblpc-control-box")
                               .append($("<div class='row'>").append($dropdown))
                               .append(this.$dataManager);
        },

        /**
         * Builds the data manager panel.
         */
        makeDataManager: function() {
            var self = this;
            var $header = $("<div/>")
                          .addClass("panel-heading")
                          .append($("<span/>")
                                  .addClass("panel-title")
                                  .append("Data Manager ")
                                 )
                          .append($("<a/>")
                                  .append($("<span/>")
                                          .addClass("glyphicon glyphicon-remove pull-right")
                                          .on("click", function(event) { self.toggleDataManager(); })
                                          )
                                 );
            var $buttonPanel = $("<div/>")
                               .addClass("btn-group btn-group-sm")
                               .append($("<button/>")
                                       .on("click", function(event) { self.toggleSelectAll($(event.currentTarget)); })
                                       .addClass("btn btn-default")
                                       .append($("<span/>")
                                               .addClass("glyphicon glyphicon-check")
                                               )
                                       )
                               .append($("<button class='btn btn-default'>")
                                       .append("Export selected")
                                       .on("click", function(event) { self.exportToWorkspace(); })
                                       );

            var $body = $("<div/>")
                        .addClass("panel-body kblpc-manager")
                        .append($buttonPanel);

            var $dm = $("<div/>")
                      .addClass("row")
                      .append($("<div/>")
                              .addClass("panel panel-default")
                              .append($header)
                              .append($body));

            return $dm;
        },

        /**
         * Toggles between selecting all elements in the data manager, and unselecting them all.
         */
        toggleSelectAll: function($target) {
            // check off everything.
            if ($target.find("> .glyphicon").hasClass("glyphicon-check")) {
                $(".kblpc-manager-dataset > div > table > tbody > tr > td > input").prop('checked', true);
            }
            // uncheck everything.
            else {
                $(".kblpc-manager-dataset > div > table > tbody > tr > td > input").prop('checked', false);
            }

            $target.find("> .glyphicon").toggleClass("glyphicon-check glyphicon-unchecked");
        },

        /**
         * Updates the data manager to show data from all cards on the screen.
         * This does its updating in place, meaning that it compares the currently shown data against what's
         * being displayed in the data manager window, and makes adjustments accordingly.
         */
        updateDataManager: function() {
            // If the data manager isn't rendered, skip this all together.
            if (!this.$dataManager)
                return;

            // get the loaded data
            var dataHash = this.getDataObjectsHash();

            // now we have a hash of all data present.
            // make some html out of it.
            var dataTypes = [];
            for (var k in dataHash) {
                if (dataHash.hasOwnProperty(k))
                    dataTypes.push(k);
            }
            dataTypes.sort();

            var $dm = this.$dataManager.find(".kblpc-manager");

            /**
             * Each datatype gets its own block ($dataBlock)
             * Each block has a header and a dataSet.
             * The header does some funkiness where it toggles which way the pointer chevron is pointing.
             * When the header is clicked it toggles the display of its corresponding dataset.
             */
            $.each(dataTypes, function(i, type) {
                var underscoreType = type.replace(" ", "_");

                var $dataBlock = $dm.find(".kblpc-manager-dataset[data-type='" + type + "']");

                //If there's no datablock for that data type, make a new one!
                if ($dataBlock.length === 0) {
                    /* make a new datablock - this is the enclosing div
                     * for the section containing a header (with data type and count)
                     * and chevron for expanding/collapsing.
                     */
                    $dataBlock = $("<div/>")
                                     .addClass("kblpc-manager-dataset")
                                     .attr("data-type", type);

                    // The chevron is just a glyphicon.
                    var $chevron = $("<span/>")
                                   .addClass("glyphicon glyphicon-chevron-down");

                    // The header contains the name of the data type and number of objects
                    var $dataHeader = $("<div/>")
                                      .addClass("row")
                                      .append($("<a/>")
                                              .attr("data-toggle", "collapse")
                                              .attr("data-target", "#kblpc-" + underscoreType)
                                              .append($chevron)
                                              .append(" " + type + " (<span id='kblpc-count'>" + dataHash[type].length + "</span>)")
                                            );

                    // The dataset is the meat of the table, the collapsible list of data object ids.
                    var $dataSetRow = $("<div/>")
                                   .attr("id", "kblpc-" + underscoreType)
                                   .attr("data-type", type)
                                   .addClass("row collapse in")
                                   .on("hidden.bs.collapse", { chevron: $chevron }, 
                                        function(event) {
                                            event.data.chevron.toggleClass("glyphicon-chevron-down");
                                            event.data.chevron.toggleClass("glyphicon-chevron-right");
                                        }
                                    )
                                   .on("shown.bs.collapse", { chevron: $chevron }, 
                                        function(event) {
                                            event.data.chevron.toggleClass("glyphicon-chevron-down");
                                            event.data.chevron.toggleClass("glyphicon-chevron-right");
                                        }
                                    )
                                   .append($("<table/>")
                                           .addClass("table"));

                    $dataBlock.append($dataHeader)
                              .append($dataSetRow);

                    $dm.append($dataBlock);
                }
                else {
                    // If we already have a datablock for that type, just update the number of elements it's showing.
                    $dataBlock.find("> div > a > span#kblpc-count").html(dataHash[type].length);
                }

                var $dataSet = $dataBlock.find("> div#kblpc-" + underscoreType + " > table");

                // search for what needs to be synched between the cards and the data manager.
                // 1. hash the list of data ids
                var dataIdHash = {};
                $.each(dataHash[type], function(j, id) {
                    dataIdHash[id] = 1;
                });

                // 2. hash the displayed elements
                var dataDivHash = {};
                $.each($dataSet.find("> tbody > tr"), function(j, child) {
                    var ws = $(child).find(":last-child").html();
                    var id = $(child).find(":nth-child(2)").html();
                    dataDivHash[ws + ":" + id] = $(child);
                });

                // 3. if it's in the idhash, and not the displayed hash, add it to the display.
                $.each(dataHash[type], function(j, wsId) {
                    if (!dataDivHash.hasOwnProperty(wsId)) {
                        var parts = wsId.split(':');
                        var ws = parts.shift();
                        var id = parts.join(':');

                        var $dataDiv = $("<tr/>")
                                       .addClass("pull-left")
                                       .append($("<td><input type='checkbox'></td> "))
                                       .append($("<td>" + id + "</td>"))
                                       .append($("<td>" + ws + "</td>"));
                        $dataSet.append($dataDiv);
                    }
                });

                // 4. if it's in the displayed hash and not the id hash, remove it from the display.
                $.each(dataDivHash, function(key, value) {
                    if (!dataIdHash.hasOwnProperty(key)) {
                        value.remove();
                    }
                });
            });

            // at the very very end, remove any blocks that don't match to any current datatypes
            // i.e.: those blocks whose last card was just removed.
            $.each($(".kblpc-manager-dataset"), function(i, element) {
                if (!dataHash.hasOwnProperty($(element).attr("data-type")))
                    $(element).remove();
            });
        },

        /**
         * Exports the selected data elements to the user's workspace.
         *
         * This pops up a modal, making sure the user wants to copy everything.
         * If so, it invokes an export handler for each data type, then does it.
         * Each export process is expected to proceed asynchronously, so the handlers should
         * all return an array of ajax promises.
         *
         * Once these promises are fulfilled, the modal goes away.
         *
         * Each data type needs to have a corresponding function called _export<type>.
         * For example, the Genome type exporter is _exportGenome.
         *
         * Each exporter is passed a list of data objects, all containing these fields:
         * {
         *    id: <object id>,
         *    workspace: <workspace id>  // note that this might be === this.cdmWorkspace
         * }
         *
         * the exporter is also passed the workspace it should export to as a separate parameter.
         * Thus, the prototype for exporters is:
         * 
         * _exportDatatype: function(data, workspace) {}
         *
         * Note that auth tokens and user ids are available as
         * this.options.auth and
         * this.options.userId, repectively.
         */
        exportToWorkspace: function() {
            // 1. Get the data to export.
            var exportData = {};

            /* Probably not optimal, but it scrapes the data to export out of
             * the HTML tables.
             * It might be best to store everything being displayed, but that's just something
             * else to keep updated on each change.
             * And we need to check what's selected anyway. This is probably more efficient.
             * Still kinda ugly, though.
             */
            $.each($(".kblpc-manager-dataset"), function(i, element) {
                var type = $(element).attr("data-type");
                $.each($(element).find("> div[data-type='" + type + "'] > table > tbody > tr"), function(j, row) {
                    if ($(row).find(":first-child > input").prop("checked")) {
                        if (!exportData.hasOwnProperty(type))
                            exportData[type] = [];

                        var ws = $(row).find(":nth-child(3)").html();
                        var id = $(row).find(":nth-child(2)").html();
                        exportData[type].push({'id': id, 'workspace': ws});

                    }
                });
            });

            /**
             * This internal function does the work of invoking all the exporters.
             */
            var exportWsId = this.ex
            var self = this;
            var doExport = function() {
                self.exportModal.body.append(self.exportModal.loadingDiv);

                var jobsList = [];
                for (var type in exportData) {
                    var exportCommand = "_export" + type;
                    jobsList = jobsList.concat(self[exportCommand](exportData[type], exportWs));
                }

                $.when.apply($, jobsList).done(function() {
                    self.exportModal.modal.modal('hide');
                });
            };

            /*
             * Now we have the data, so make an "Are you REALLY sure?" modal.
             * If the user says yes, modify it to show a progress bar or something.
             */

            if (this.options.auth === null || this.options.userId === null) {
                this.exportModal.errorBody.html("You must be logged in to export data!");
                this.exportModal.okButton.addClass("hide");
                this.exportModal.errorBody.show();
                this.exportModal.wsDataBody.hide();
            }
            else if (Object.keys(exportData).length === 0) {
                this.exportModal.errorBody.html("No data selected for export!");
                this.exportModal.okButton.addClass("hide");
                this.exportModal.errorBody.show();
                this.exportModal.wsDataBody.hide();
            }
            else {
                // var $bodyHtml = "Export selected data to workspace '<b>" + exportWs + "</b>'?";
                // this.exportModal.body.html($bodyHtml);
                this.exportModal.okButton.removeClass("hide");
                this.exportModal.okButton.click(function(event) { doExport(); });
                this.exportModal.errorBody.hide();
                this.exportModal.wsDataBody.show();
            }
            this.exportModal.modal.modal({'backdrop': 'static', 'keyboard': false});


            // Each data type needs an export handler. Might need to be handled elsewhere?
            // Or at least handled later.


        },

        _exportGenome: function(data, workspace) {
            // capture the list of async workspace api calls.
            var exportJobs = [];

            for (var i=0; i<data.length; i++) {
                var obj = data[i];
                if (obj.workspace === this.cdmWorkspace) {
                    this.dbg("exporting central store genome " + obj.id + " to workspace '" + workspace + "'");
                    var self = this;
                    exportJobs.push(this.fbaClient.genome_to_workspace(
                        {
                            genome: obj.id,
                            workspace: workspace,
                            auth: this.options.auth
                        },
                        function(objectMeta) {
                            self.dbg(objectMeta);
                        },
                        this.kbaseClientError
                    ));
                }
                else {
                    this.dbg("copying workspace genome " + obj.ws + ":" + obj.id + " to workspace");
                }
            }

            return exportJobs;
        },

        _exportDescription: function(data, workspace) {
            this.dbg("Exporting description");
            this.dbg(data);

            return [];
        },

        _exportContig: function(data, workspace) {
            this.dbg("Exporting contigs");
            this.dbg(data);

            return [];
        },

        _exportFeature: function(data, workspace) {
            this.dbg("Exporting genes");
            this.dbg(data);

            return [];
        },
    
        _exportMemeRunResult: function(data, workspace) {
            this.dbg("Exporting MEME run result");
            this.dbg(data);

            return [];
        },

        _exportCmonkeyRunResult: function(data, workspace) {
            this.dbg("Exporting cMonkey run result");
            this.dbg(data);

            return [];
        },

        _exportInferelatorRunResult: function(data, workspace) {
            this.dbg("Exporting Inferelator run result");
            this.dbg(data);

            return [];
        },

        _exportRegulome: function(data, workspace) {
            this.dbg("Exporting Regulome");
            this.dbg(data);

            return [];
        },

        _exportMAKResult: function(data, workspace) {
            this.dbg("Exporting MAK result");
            this.dbg(data);

            return [];
        },

        _exportBambiRunResult: function(data, workspace) {
            this.dbg("Exporting BAMBI run result");
            this.dbg(data);

            return [];
        },

        /**
         * Toggles the data manager div
         */
        toggleDataManager: function() {
            this.$dataManager.toggle();
        },

        /**
         * Saves the card layout to the user state space.
         */
        saveLayout: function() {
            window.alert("save layout");
        },

        /**
         * Loads a layout from the user state space.
         */
        loadLayout: function() {
            window.alert("load layout");
        },

        showInitialCards: function() {
            // if no template given, just load a blank layout.
            if (!this.options.template)
                return;

            if (this.options.template.toLowerCase() === "genome")
                this.showGenomeCards();
            else if (this.options.template.toLowerCase() === "gptype")
                this.showGWASPopCards();
            else if (this.options.template.toLowerCase() === "gttype")
                this.showGWASTraitCards();
            else if (this.options.template.toLowerCase() === "gvtype")
                this.showGWASVarCards();
            else if (this.options.template.toLowerCase() === "ggltype")
                this.showGWASGeneListCards();
            else if (this.options.template.toLowerCase() === "gtvtype")
                this.showGWASTopVariationsCards();
            else if (this.options.template.toLowerCase() === "gpstype")
                this.showGWASPopulationSummaryCards();
            else if (this.options.template.toLowerCase() === "meme")
                this.showMemeCards();
            else if (this.options.template.toLowerCase() === "cmonkey")
                this.showCmonkeyCards();
            else if (this.options.template.toLowerCase() === "inferelator")
                this.showInferelatorCards();
            else if (this.options.template.toLowerCase() === "regprecise")
                this.showRegpreciseCards();
            else if (this.options.template.toLowerCase() === "mak")
                this.showMAKCards();
            else if (this.options.template.toLowerCase() === "bambi")
                this.showBambiCards();
            else if (this.options.template.toLowerCase() === "gene")
                this.showGeneCards();
            else if (this.options.template.toLowerCase() === "model")
                this.showModelCards();
            else if (this.options.template.toLowerCase() === "spec")
                this.showSpecCards();
            else if (this.options.template.toLowerCase() === "ppid")
                this.showPPICards();
            else {
                // throw an error for an unknown template. modal dialog, maybe?
            }
        },

        /**
         * Initial template for showing genome cards.
         * Shows a genome overview and a description card.
         */
        showGenomeCards: function() {
            if (this.options.data.workspaceID === "CDS")
                this.options.data.workspaceID = null;
                this.addNewCard("KBaseGenomeOverview", 
                {
                    genomeID: this.options.data.genomeID,
                    loadingImage: this.options.loadingImage,
                    workspaceID: this.options.data.workspaceID,
                    kbCache: this.options.data.kbCache,
                    isInCard: true
                },
                {
                    my: "left top",
                    at: "left bottom",
                    of: "#app"
                }
            );

            this.addNewCard("KBaseWikiDescription",
                {
                    genomeID: this.options.data.genomeID,
                    loadingImage: this.options.loadingImage,
                    workspaceID: this.options.data.workspaceID,
                    kbCache: this.options.data.kbCache,
                },
                {
                    my: "left top",
                    at: "left+330 bottom",
                    of: "#app"
                }
            );
            return this;
        },



        /**
         * Template for showing gene cards.
         */
        showGeneCards: function() {
            // this.addNewCard("KBaseGeneInfo",
            //     {
            //         featureID: this.options.data.featureID,
            //     },
            //     {
            //         my: "left top",
            //         at: "left bottom",
            //         of: "#app"
            //     }
            // );
            this.addNewCard("KBaseGeneInstanceInfo",
                {
                    featureID: this.options.data.featureID,
                    genomeID: this.options.data.genomeID,
                    workspaceID: this.options.data.workspaceID,
                    kbCache: this.options.data.kbCache
                },
                {
                    my: "left top",
                    at: "left bottom",
                    of: "#app"
                }
            );
        },

        /**
         * Template for showing gwas model cards.
         */
        showGWASPopCards: function() {
            var populationMapCard = this.addNewCard("KBaseGWASPopMaps",
                { id: this.options.data.id, ws: this.options.data.ws},
                { my: "left top",
                  at: "left-30 top",
                  of: "#app"});
            var populationCard = this.addNewCard("KBaseGWASPop",
                { id: this.options.data.id, ws: this.options.data.ws},
                { my: "left top",
                  at: "left-30 top+550",
                  of: "#app"});
            var populationTableCard = this.addNewCard("KBaseGWASPopTable",
                { id: this.options.data.id, ws: this.options.data.ws},
                { my: "right top",
                  at: "right-20 top+550",
                  of: "#app"});
        },

        /**
         * Template to show GWAS traits data
         */
        showGWASTraitCards: function() {
            this.addNewCard("KBaseGWASTraitMaps",
                { id: this.options.data.id, ws: this.options.data.ws},
                { my: "left top",
                  at: "left bottom",
                  of: "#app"});
            this.addNewCard("KBaseGWASTraitTable",
                { id: this.options.data.id, ws: this.options.data.ws},
                { my: "left top",
                  at: "left bottom+600",
                  of: "#app"});
        },

        /**
         * Template to show GWAS variation data
         */
        showGWASVarCards: function() {
            this.addNewCard("KBaseGWASVarTable",
                { id: this.options.data.id, ws: this.options.data.ws},
                { my: "left top",
                  at: "left bottom",
                  of: "#app"});
        },

        /**
         * Template for showing GWAS Gene List
         */
         showGWASGeneListCards: function() {
            this.addNewCard("KBaseGWASGeneListTable",
                { id: this.options.data.id, ws: this.options.data.ws},
                { my: "left top",
                  at: "left bottom",
                  of: "#app"});
         },

        /**
         * Template for showing GWAS Top Variations
         */
         showGWASTopVariationsCards: function() {
            this.addNewCard("KBaseGWASTopVariations",
                { id: this.options.data.id, ws: this.options.data.ws},
                { my: "left top",
                  at: "left bottom",
                  of: "#app"});
            this.addNewCard("KBaseGWASTopVariationsTable",
                { id: this.options.data.id, ws: this.options.data.ws},
                { my: "left top",
                  at: "left+410 bottom",
                  of: "#app"});
        },

        /**
         * Template for showing GWAS Population Summary
         */
         showGWASPopulationSummaryCards: function() {
            this.addNewCard("KBaseGWASSummaryPop",
                { id: this.options.data.id, ws: this.options.data.ws},
                { my: "left top",
                  at: "left bottom",
                  of: "#app"});
        },
        /**
         * Template for showing model cards.
         */
        showModelCards: function() {
            // testing layout manager.
            // I'm thinking I shouldn't use this because api calls 
            // are made outside of the widgets
            this.addNewCard("kbaseModelMeta", 
                { data: this.options.data,
                  title: this.options.title,
                  id: this.options.id,
                  ws: this.options.ws},
                { my: "left top+50",
                  at: "left bottom",
                  of: "#app"});
        },

        /**
         * Initial template for showing MEME cards.
         */
        
        showMemeCards: function() {
            var pattMeme = /MemeRunResult/i;
            var pattTomtom = /TomtomRunResult/i;
            var pattMast = /MastRunResult/i;
            if (this.options.data.id.match(pattMeme)){
                this.addNewCard("KBaseMemeRunResultCard",
                        {
                            id: this.options.data.id,
                            ws: this.options.data.ws,
                            auth: this.options.auth,
                            userId: this.options.userId,
                            loadingImage: this.options.loadingImage,
                            isInCard: true
                        },
                        {
                            my: "left top",
                            at: "left bottom",
                            of: "#app"
                        }
                    );
                return this;
            }
            else if (this.options.data.id.match(pattTomtom)){
                this.addNewCard("KBaseTomtomRunResultCard",
                        {
                            id: this.options.data.id,
                            ws: this.options.data.ws,
                            auth: this.options.auth,
                            userId: this.options.userId,
                            loadingImage: this.options.loadingImage,
                            isInCard: true
                        },
                        {
                            my: "left top",
                            at: "left bottom",
                            of: "#app"
                        }
                    );
                return this;
            }
            else if (this.options.data.id.match(pattMast)){
                this.addNewCard("KBaseMastRunResultCard",
                        {
                            id: this.options.data.id,
                            ws: this.options.data.ws,
                            auth: this.options.auth,
                            userId: this.options.userId,
                            loadingImage: this.options.loadingImage,
                            isInCard: true
                        },
                        {
                            my: "left top",
                            at: "left bottom",
                            of: "#app"
                        }
                    );
                return this;
            } else {
                return this;
            };
        },
        
        showCmonkeyCards: function() {
                this.addNewCard("KBaseCmonkeyRunResultCard",
                        {
                            id: this.options.data.id,
                            ws: this.options.data.ws,
                            auth: this.options.auth,
                            userId: this.options.userId,
                            loadingImage: this.options.loadingImage,
                            isInCard: true
                        },
                        {
                            my: "left top",
                            at: "left bottom",
                            of: "#app"
                        }
                    );
                return this;
        },

        showInferelatorCards: function() {
                this.addNewCard("KBaseInferelatorRunResultCard",
                        {
                            id: this.options.data.id,
                            ws: this.options.data.ws,
                            auth: this.options.auth,
                            userId: this.options.userId,
                            loadingImage: this.options.loadingImage,
                            isInCard: true
                        },
                        {
                            my: "left top",
                            at: "left bottom",
                            of: "#app"
                        }
                    );
                return this;
        },

        showRegpreciseCards: function() {
                this.addNewCard("KBaseRegulomeCard",
                        {
                            id: this.options.data.id,
                            ws: this.options.data.ws,
                            auth: this.options.auth,
                            userId: this.options.userId,
                            loadingImage: this.options.loadingImage,
                            isInCard: true
                        },
                        {
                            my: "left top",
                            at: "left bottom",
                            of: "#app"
                        }
                    );
                return this;
        },

        showMAKCards: function() {
                this.addNewCard("KBaseMAKResultCard",
                        {
                            id: this.options.data.id,
                            ws: this.options.data.ws,
                            auth: this.options.auth,
                            userId: this.options.userId,
                            loadingImage: this.options.loadingImage,
                            isInCard: true
                        },
                        {
                            my: "left top",
                            at: "left bottom",
                            of: "#app"
                        }
                    );
                return this;
        },

    showPPICards: function() {
        this.addNewCard("KBasePPICard",
                {
                id: this.options.data.id,
                ws: this.options.data.ws,
                auth: this.options.auth,
                userId: this.options.userId,
                loadingImage: this.options.loadingImage,
                isInCard: true
                },
                {
                my: "left top",
                at: "left bottom",
                of: "#app"
                }
               );
        return this;
    },

        showBambiCards: function() {
                this.addNewCard("KBaseBambiRunResultCard",
                        {
                            bambi_run_result_id: this.options.data.bambi_run_result_id,
                            workspace_id: this.options.data.workspace_id,
                            auth: this.options.auth,
                            userId: this.options.userId,
                            loadingImage: this.options.loadingImage,
                            isInCard: true
                        },
                        {
                            my: "left top",
                            at: "left bottom",
                            of: "#app"
                        }
                    );
                return this;
        },

        /**
         * Template for showing spec-document elements cards.
         */
        showSpecCards: function() {
            var cardName = 'KBaseSpecUnknownCard';
            if (this.options.data.kind === "storage") {
                cardName = 'KBaseSpecStorageCard';
            } else if (this.options.data.kind === "module") {
                cardName = 'KBaseSpecModuleCard';
            } else if (this.options.data.kind === "type") {
                cardName = 'KBaseSpecTypeCard';
            } else if (this.options.data.kind === "function") {
                cardName = 'KBaseSpecFunctionCard';
            }               
            this.addNewCard(cardName,
                        {
                            id: this.options.data.id,
                            token: this.options.auth
                        },
                        {
                            my: "left top",
                            at: "left bottom",
                            of: "#app"
                        }
                    );
            return this;
        },

        /**
         * Registers all events that this manager should know about.
         * Also makes a list of all registered events, stored in this.registeredEvents[], so they
         * can be unregistered.
         */
        registerEvents: function() {
            var self = this;

            this.registeredEvents = ["featureClick", 
                                     "showContig",
                                     "showGenome", 
                                     "showFeature",
                                     "showGenomeDescription",
                                     "showGWASPopDetails",
                                     "showGWASPopCards",
                                     "showDomains", 
                                     "showOperons", 
                                     "showBiochemistry", 
                                     "showSpecElement", 
                                     "showMemeMotif", 
                                     "showMemeRunParameters", 
                                     "showMemeRawOutput", 
                                     "showTomtomHits", 
                                     "showTomtomRunParameters", 
                                     "showMastHits",
                                     "showMastRunParameters", 
                                     "showCmonkeyCluster", 
                                     "showCmonkeyMotif",
                                     "showInferelatorHits",
                                     "showNetwork",
                                     "showRegulon",
                                     "showMAKCluster", 
                                     "showBambiMotif",
                                     "showBambiRunParameters", 
                                     "showBambiRawOutput"];

            /**
             * Event: showDomains
             * ------------------
             * Adds new KBaseGeneDomains card.
             */
            $(document).on("showDomains", function(event, data) {
                self.addNewCard("KBaseGeneDomains",
                {
                    featureID: data.featureID
                },
                {
                    my: "left top",
                    at: "center",
                    of: data.event
                });
            });

            /**
             * Event: showOperons
             * ------------------
             * Adds new KBaseGeneOperon card, based on the feature that was clicked.
             */
            $(document).on("showOperons", function(event, data) {
                self.addNewCard("KBaseGeneOperon",
                {
                    featureID: data.featureID,
                    loadingImage: self.options.loadingImage,
                },
                {
                    my: "left top",
                    at: "center",
                    of: data.event
                });
            });

            /**
             * Event: showBiochemistry
             * -----------------------
             * Adds new KBaseGeneBiochemistry card, based on a feature ID.
             */            
            $(document).on("showBiochemistry", function(event, data) {
                self.addNewCard("KBaseGeneBiochemistry",
                {
                    featureID: data.featureID,
                    genomeID: data.genomeID,
                    workspaceID: data.workspaceID,
                    kbCache: data.kbCache,
                },
                {
                    my: "left top",
                    at: "center",
                    of: data.event
                });
            });

            /**
             * Event: featureClick
             * -------------------
             * Adds cards based on clicking on a feature.
             */
            $(document).on("featureClick", function(event, data) {
                // self.addNewCard("KBaseGeneInfo", 
                //     { 
                //         featureID: data.feature.feature_id, 
                //     },
                //     {
                //         my: "left top",
                //         at: "center",
                //         of: data.featureElement
                //     }
                // );

                self.addNewCard("KBaseGeneInstanceInfo",
                    {
                        featureID: data.feature.feature_id,
                        workspaceID: data.workspaceId,
                        genomeID: data.genomeId,
                        kbCache: data.kbCache,
                    },
                    {
                        my: "left top",
                        at: "center",
                        of: data.featureElement
                    }
                );
            });

            /**
             * Event: showContig
             * -----------------
             * Adds new KBaseContigBrowser card for a given contig ID,
             * and centered on a feature (if one's available).
             */
            $(document).on("showContig", function(event, data) {
                self.addNewCard("KBaseContigBrowser",
                    {
                        contig: data.contig,
                        genomeId: data.genomeId,
                        workspaceId: data.workspaceId,
                        showButtons: true,
                        loadingImage: self.options.loadingImage,
                        centerFeature: data.centerFeature,
                        kbCache: data.kbCache,
                    },
                    {
                        my: "left top",
                        at: "center",
                        of: data.event
                    }
                );
            });

            /**
             * Event: showFeature
             * -----------------
             * Adds new KBaseGeneInfo card for a given Feature ID
             */
            $(document).on("showFeature", function(event, data) {
                self.addNewCard("KBaseGeneInfo",
                    {
                        featureID: data.featureID,
                        workspaceID: data.workspaceID,
                        genomeID: data.genomeID,
                        kbCache: data.kbCache,
                    },
                    {
                        my: "left top",
                        at: "center",
                        of: data.event
                    }
                );
            });

            /**
             * Event: showGenome
             * -----------------
             * Adds a genome overview card for the given genome ID
             */
            $(document).on("showGenome", function(event, data) {
                self.addNewCard("KBaseGenomeOverview",
                    {
                        genomeID: data.genomeID,
                        workspaceID: data.workspaceID,
                        kbCache: data.kbCache,
                        isInCard: true
                    },
                    {
                        my: "left top",
                        at: "center",
                        of: data.event
                    }
                );
            });

            $(document).on("showGenomeDescription", function(event, data) {
                self.addNewCard("KBaseWikiDescription",
                    {
                        genomeID: data.genomeID,
                        workspaceID: data.workspaceID,
                        kbCache: data.kbCache,
                        loadingImage: self.options.loadingImage,
                    },
                    {
                        my: "left top",
                        at: "center",
                        of: data.event
                    }
                );
            });


            /**
             * Event: showMemeMotif
             * -------------------
             * Adds new MEME Motif card.
             */
            $(document).on("showMemeMotif", function(event, data) {
                self.addNewCard("KBaseMemeMotifCard",
                    {
                        motif: data.motif,
                        showButtons: true,
                        centerFeature: data.centerFeature
                    },
                    {
                        my: "left top",
                        at: "left+800 bottom",
                        of: "#app"
                    }
                );
            });
            
            /**
             * Event: showMemeRunParameters
             * -------------------
             * Adds card with MEME run parameters.
             */

            $(document).on("showMemeRunParameters", function(event, data) {
                self.addNewCard("KBaseMemeRunParametersCard",
                    {
                        collection: data.collection,
                        showButtons: true,
                        centerFeature: data.centerFeature
                    },
                    {
                        my: "left top",
                        at: "left bottom+480",
                        of: "#app"
                    }
                );
            });

            /**
             * Event: showMemeRawOutput
             * -------------------
             * Adds card with raw MEME output.
             */
            $(document).on("showMemeRawOutput", function(event, data) {
                self.addNewCard("KBaseMemeRawOutputCard",
                    {
                        memeOutput: data.memeOutput,
                        showButtons: true,
                        centerFeature: data.centerFeature
                    },
                    {
                        my: "center top",
                        at: "center bottom",
                        of: "#app"
                    }
                );
            });


            /**
             * Event: showTomtomHits
             * -------------------
             * Adds new TOMTOM Hit List card.
             */
            $(document).on("showTomtomHits", function(event, data) {
                self.addNewCard("KBaseTomtomHitsCard",
                    {
                        tomtomresult: data.tomtomresult,
                        showButtons: true,
                        centerFeature: data.centerFeature
                    },
                    {
                        my: "left top+400",
                        at: "left bottom",
                        of: "#app"
                    }
                );
            });

            /**
             * Event: showTomtomRunParameters
             * -------------------
             * Adds new TOMTOM Hits card.
             */
            $(document).on("showTomtomRunParameters", function(event, data) {
                self.addNewCard("KBaseTomtomRunParametersCard",
                    {
                        tomtomresult: data.tomtomresult,
                        showButtons: true,
                        centerFeature: data.centerFeature
                    },
                    {
                        my: "left top",
                        at: "left+420 bottom",
                        of: "#app"
                    }
                );
            });

            /**
             * Event: showMastHits
             * -------------------
             * Adds new MAST Hit List card.
             */
            $(document).on("showMastHits", function(event, data) {
                self.addNewCard("KBaseMastHitsCard",
                    {
                        mastresult: data.mastresult,
                        showButtons: true,
                        centerFeature: data.centerFeature
                    },
                    {
                        my: "left+440 top",
                        at: "left bottom",
                        of: "#app"
                    }
                );
            });

            /**
             * Event: showMastRunParameters
             * -------------------
             * Adds new TOMTOM Hits card.
             */
            $(document).on("showMastRunParameters", function(event, data) {
                self.addNewCard("KBaseMastRunParametersCard",
                    {
                        mastresult: data.mastresult,
                        showButtons: true,
                        centerFeature: data.centerFeature
                    },
                    {
                        my: "left top",
                        at: "left+420 bottom",
                        of: "#app"
                    }
                );
            });

            /**
             * Event: showCmonkeyCluster
             * -------------------
             * Adds card with cMonkey bi-cluster.
             */

            $(document).on("showCmonkeyCluster", function(event, data) {
                self.addNewCard("KBaseCmonkeyClusterCard",
                    {
                        cluster: data.cluster,
                        showButtons: true,
                        centerFeature: data.centerFeature
                    },
                    {
                        my: "left top",
                        at: "left+600 bottom",
                        of: "#app"
                    }
                );
            });

            /**
             * Event: showCmonkeyMotif
             * -------------------
             * Adds new cMonkey Motif card.
             */
            $(document).on("showCmonkeyMotif", function(event, data) {
                self.addNewCard("KBaseCmonkeyMotifCard",
                    {
                        motif: data.motif,
                        showButtons: true,
                        centerFeature: data.centerFeature
                    },
                    {
                        my: "center top",
                        at: "center bottom",
                        of: "#app"
                    }
                );
            });

            /**
             * Event: showInferelatorHits
             * -------------------
             * Adds card with Inferelator hit list.
             */

            $(document).on("showInferelatorHits", function(event, data) {
                self.addNewCard("KBaseInferelatorHitsCard",
                    {
                        inferelatorrunresult: data.inferelatorrunresult,
                        showButtons: true,
                        centerFeature: data.centerFeature
                    },
                    {
                        my: "left top",
                        at: "left+600 bottom",
                        of: "#app"
                    }
                );
            });

            /**
             * Event: showRegulon
             * -------------------
             * Adds card with Regulon.
             */

            $(document).on("showRegulon", function(event, data) {
                self.addNewCard("KBaseRegulonCard",
                    {
                        regulon: data.regulon,
                        showButtons: true,
                        centerFeature: data.centerFeature
                    },
                    {
                        my: "left top",
                        at: "left+600 bottom",
                        of: "#app"
                    }
                );
            });

            /**
             * Event: showMAKBicluster
             * -------------------
             * Adds card with MAK bi-cluster.
             */

            $(document).on("showMAKBicluster", function(event, data) {
                self.addNewCard("KBaseMAKBiclusterCard",
                    {
                        bicluster: data.bicluster,
                        showButtons: true,
                        centerFeature: data.centerFeature
                    },
                    {
                        my: "left top",
                        at: "left+600 bottom",
                        of: "#app"
                    }
                );
            });

            /**
             * Event: showBambiMotif
             * -------------------
             * Adds new BAMBI Motif card.
             */
            $(document).on("showBambiMotif", function(event, data) {
                self.addNewCard("KBaseBambiMotifCard",
                    {
                        motif: data.motif,
                        showButtons: true,
                        centerFeature: data.centerFeature
                    },
                    {
                        my: "left top",
                        at: "left+800 bottom",
                        of: "#app"
                    }
                );
            });
            
            /**
             * Event: showBambiRunParameters
             * -------------------
             * Adds card with BAMBI run parameters.
             */

            $(document).on("showBambiRunParameters", function(event, data) {
                self.addNewCard("KBaseBambiRunParametersCard",
                    {
                        collection: data.collection,
                        showButtons: true,
                        centerFeature: data.centerFeature
                    },
                    {
                        my: "left top",
                        at: "left bottom+480",
                        of: "#app"
                    }
                );
            });

            /**
             * Event: showBambiRawOutput
             * -------------------
             * Adds card with raw Bambi output.
             */
            $(document).on("showBambiRawOutput", function(event, data) {
                self.addNewCard("KBaseBambiRawOutputCard",
                    {
                        raw_output: data.raw_output,
                        showButtons: true,
                        centerFeature: data.centerFeature
                    },
                    {
                        my: "center top",
                        at: "center bottom",
                        of: "#app"
                    }
                );
            });            
            
            
            /**
             * Event: showSpecElement
             * ------------------
             * Adds new KBaseSpec[Storage|Module|Type|Function]Card card.
             */
            $(document).on("showSpecElement", function(event, data) {
                var cardName = 'KBaseSpecUnknownCard';
                if (data.kind === "storage") {
                    cardName = 'KBaseSpecStorageCard';
                } else if (data.kind === "module") {
                    cardName = 'KBaseSpecModuleCard';
                } else if (data.kind === "type") {
                    cardName = 'KBaseSpecTypeCard';
                } else if (data.kind === "function") {
                    cardName = 'KBaseSpecFunctionCard';
                }
                self.addNewCard(cardName,
                {
                    id: data.id,
                    token: data.token
                },
                {
                    my: "left top",
                    at: "center",
                    of: data.event
                });
            });

            /**
             * Event: showNetwork
             * -------------------
             * Adds card with Cytoscape.js view of a network
             */
        $(document).on("showNetwork", function(event, data) {
        self.addNewCard("KBaseNetworkCard",
                {
                    network: data.network,
                    netname: data.netname,
                },
                {
                    my: "left top",
                    at: "left+600 bottom",
                    of: "#app"
                }
                   );
        });

            $(document).on("helloClick", function(event, data) {
                window.alert(data.message);
            })
        },

        /**
         * Adds a new card to the layout manager. This needs three parameters:
         * 1. cardName - the name of the card widget to be invoked. E.g. 'KBaseGenomeOverview' for the
         *               Genome Overview widget.
         * 2. options - the options object to be passed to the card.
         * 3. position - a jQuery-UI position object for the initial position to put the card.
         *               See the jquery-ui position docs for details.
         */
        addNewCard: function(cardName, options, position) {
            /** position = optional. if none given, it puts the new card in the center of the page **/

            /* NOTE - later, have it manage where the new card comes in here.
             *
             * Should be a way to use the dialog/position jqueryUI stuff.
             * Something like:
             * 
             * $("#id").dialog({
             *      position: {
             *          my: 'top',
             *          at: 'top',
             *          of: $("#initializing element")
             *      }
             * });
             *
             * Would need to pass in whatever's the initializer, i.e. the
             * card that wants to spawn a new one. Or null (or maybe $(window)?)
             * to make it relative to the page.
             */

            /*
             * When we make a new card, we store it in the manager like this:
             * cards[cardId] = {
             *     card: <the kbaseLandingCard>
             *     data: <the widget embedded in the card>
             * }
             *
             * This implies that each widget to be used in a card needs to expose
             * what its data type is and what the data component is.
             *
             * The data component should be a simple object like this:
             * {
             *     id: object ID,
             *     type: typed object name (Genome, FBAModel, etc. Whatever's registered as the typed object name)
             *     workspace: <optional> the workspace name it's located in.
             * }
             *
             * It should be available as widget.getData()
             */

            var newCardId = "kblpc" + this.cardIndex;

            if (position === null) {
                position = {
                    my: "center",
                    at: "center",
                    of: "window"
                }
            }

            this.$elem.append("<div id='" + newCardId + "'/>");

            var newWidget = $("#" + newCardId)[cardName](options);

            // if widget has getData() method, get panel title stuff,
            // otherwise use options.
            if (newWidget.getData) {
                var data = newWidget.getData();
                var cardTitle = data.title ? data.title : "";
                var cardSubtitle = data.id ? data.id : "";
                var cardWidth = newWidget.options.width ? newWidget.options.width : this.defaultWidth;
                var cardWorkspace = data.workspace ? data.workspace : this.cdmWorkspace;
            } else {
                console.log('here')
                var cardTitle = options.title ? options.title : "";
                var cardSubtitle = options.id ? options.id : "";
                var cardWidth = options.width ? options.width : this.defaultWidth;                
                var cardWorkspace = options.workspace ? options.workspace : this.cdmWorkspace;                
            }

            var cardOptions = {
                position: position,
                title: "<div>" + 
                       cardTitle + 
                       "</div>" +
                       "<div class='kblpc-subtitle'>" + 
                       cardSubtitle + 
                       "<span class='label label-primary pull-right'>" +
                       cardWorkspace + 
                       "</span></div>",
                width: cardWidth,
                id: newCardId,
            };

            if (newWidget.options.height)
                cardOptions.height = newWidget.options.height;

            var self = this;
            var newCard = newWidget.$elem.LandingPageCard(cardOptions); //$("#" + newCardId).LandingPageCard(cardOptions);

            this.cards[newCardId] = {
                card: newCard,
                widget: newWidget,
                name: cardName
            };

            $("#" + newCardId).on("")


            this.cardIndex++;

            this.updateDataManager();
        },

        /**
         * Invoked when a card is closed - removes it from the set of cards that this manager knows about.
         */
        cardClosed: function(id) {
            delete this.cards[id];
            this.updateDataManager();
        },

        getDataObjectsHash: function() {
            var data = this.getDataObjects();
            // shuffle it into a hash of unique ids and a list of their workspaces.

            var dataHash = {};
            var self = this;
            $.each(data, function(i, obj) {
                // accessors to make this legible.
                var t = obj.type;
                var id = obj.id;

                var ws = obj.workspace;
                if (!ws)
                    ws = self.cdmWorkspace;

                var idStr = ws + ":" + id;
                if (dataHash[t]) {
                    if ($.inArray(idStr, dataHash[t]) === -1) {
                        dataHash[t].push(idStr);
                    }
                }
                else
                    dataHash[t] = [idStr];
            });

            return dataHash;
        },

        getDataObjects: function() {
            var data = [];
            for (var cardId in this.cards) {
                try {
                    var cardData = this.cards[cardId].widget.getData();
                } catch(err) {
                    throw err.message+' for widget: '+this.cards[cardId].name;
                }

                // This is hacky as hell for now. 
                // 
                // Cases
                // 1. cardData.id = array and cardData.workspace != array
                //   Add a new data hunk for each id, point to same workspace.
                // 2. cardData.id = array and cardData.workspace = array
                //   Assume there's a one-to-one matching, do as above.
                //   If not a one to one matching, match what's there, and leave rest of workspaces blank.
                // 3. cardData.id != array, cardData.workspace != array
                //   I like this case.
                // 4. cardData.id = scalar, cardData.workspace = array
                //   Doubt this'll happen, ignore until it's a problem.

                if (Array.isArray(cardData.id)) {
                    for (var i in cardData.id) {
                        var id = cardData.id[i];
                        var ws = "";
                        if (!Array.isArray(cardData.workspace))
                            ws = cardData.workspace;

                        else if (Array.isArray(cardData.workspace) && cardData.workspace[i])
                            ws = cardData.workspace[i];

                        data.push({ id: id, workspace: ws, type: cardData.type }); // don't need title.
                    }
                }
                else
                    data.push(this.cards[cardId].widget.getData());
            }
            return data;
        },

        kbaseClientError: function(error) {
            this.dbg("A KBase client error occurred: ");
            this.dbg(error);
        },

        closeAllCards: function() {
            for (var cardId in this.cards) {
                this.cards[cardId].card.LandingPageCard("close");
            }
        },

        /**
         * When the manager is destroyed, it needs to:
         * 1. Close all cards.
         * 2. Unregister all card events.
         * 3. Remove itself from the DOM.
         *
         * That third one might be more appropriate to occur outside of this widget, but here it is for now.
         */
        destroy: function() {
            this.closeAllCards();

            $(document).off("kbaseCardClosed");
            this.$elem.empty();
            this.cards = {};
            this.$elem.remove();

            for (var i=0; i<this.registeredEvents.length; i++) {
                $(document).off(this.registeredEvents[i]);
            }
            this.$controlBox.remove();
        },
    });
})( jQuery );
