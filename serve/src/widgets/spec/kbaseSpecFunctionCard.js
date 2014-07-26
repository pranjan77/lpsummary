(function( $, undefined ) { 
    $.KBWidget({ 
        name: "KBaseSpecFunctionCard", 
        parent: "kbaseWidget", 
        version: "1.0.0",
        timer: null,

        options: {
            id: "",
            name: "",
            width: 600,
            token: null
        },

        init: function(options) {
            this._super(options);
            var self = this;
            var container = this.$elem;
            self.$elem.append('<p class="muted loader-table"><img src="assets/img/ajax-loader.gif"> loading...</p>');

            var kbws = new Workspace(newWorkspaceServiceUrlForSpec, {token: options.token});
            var funcName = this.options.id;
            var funcVer = null;
            if (funcName.indexOf('-') >= 0) {
            	funcVer = funcName.substring(funcName.indexOf('-') + 1);
            	funcName = funcName.substring(0, funcName.indexOf('-'));
            }
        	self.options.name = funcName;
        	var pref = generateSpecPrefix();
        	
            kbws.get_func_info(this.options.id, function(data) {
            	$('.loader-table').remove();

            	// build tabs
            	var tabNames = ['Overview', 'Spec-file', 'Sub-types', 'Versions'];
            	var tabIds = ['overview', 'spec', 'subs', 'vers'];
            	var tabs = $('<ul id="'+pref+'table-tabs" class="nav nav-tabs"/>');
                tabs.append('<li class="active"><a href="#'+pref+tabIds[0]+'" data-toggle="tab" >'+tabNames[0]+'</a></li>');
            	for (var i=1; i<tabIds.length; i++) {
                	tabs.append('<li><a href="#'+pref+tabIds[i]+'" data-toggle="tab">'+tabNames[i]+'</a></li>');
            	}
            	container.append(tabs);

            	// tab panel
            	var tab_pane = $('<div id="'+pref+'tab-content" class="tab-content">');
            	tab_pane.append('<div class="tab-pane in active" id="'+pref+tabIds[0]+'"/>');
            	for (var i=1; i<tabIds.length; i++) {
                	var tableDiv = $('<div class="tab-pane in" id="'+pref+tabIds[i]+'"> ');
                	tab_pane.append(tableDiv);
            	}
            	container.append(tab_pane);
            
            	// event for showing tabs
            	$('#'+pref+'table-tabs a').click(function (e) {
            		e.preventDefault();
            		$(this).tab('show');
            	});

            	////////////////////////////// Overview Tab //////////////////////////////
            	$('#'+pref+'overview').append('<table class="table table-striped table-bordered" \
                        style="margin-left: auto; margin-right: auto;" id="'+pref+'overview-table"/>');
            	funcVer = data.func_def;
            	funcVer = funcVer.substring(funcVer.indexOf('-') + 1);
                var overviewTable = $('#'+pref+'overview-table');
                overviewTable.append('<tr><td>Name</td><td>'+funcName+'</td></tr>');
                overviewTable.append('<tr><td>Version</td><td>'+funcVer+'</td></tr>');
                var moduleName = funcName.substring(0, funcName.indexOf('.'));
                var moduleLinks = [];
                for (var i in data.module_vers) {
                	var moduleVer = data.module_vers[i];
                	var moduleId = moduleName + '-' + moduleVer;
                	moduleLinks[moduleLinks.length] = '<a onclick="specClicks[\''+pref+'modver-click\'](this,event); return false;" data-moduleid="'+moduleId+'">'+moduleVer+'</a>';
                }
                overviewTable.append('<tr><td>Module version(s)</td><td>'+moduleLinks+'</td></tr>');
            	overviewTable.append('<tr><td>Description</td><td><textarea style="width:100%;" cols="2" rows="7" readonly>'+data.description+'</textarea></td></tr>');
            	specClicks[pref+'modver-click'] = (function(elem, e) {
                    var moduleId = $(elem).data('moduleid');
                    self.trigger('showSpecElement', 
                    		{
                    			kind: "module", 
                    			id : moduleId,
                    			token: options.token,
                    			event: e
                    		});
                });
            	
            	////////////////////////////// Spec-file Tab //////////////////////////////
                var specText = $('<div/>').text(data.spec_def).html();
                specText = replaceMarkedTypeLinksInSpec(moduleName, specText, pref+'links-click');
            	$('#'+pref+'spec').append(
            			'<div id="'+pref+'specdiv" style="width:100%; overflow-y: auto; height: 300px;"><pre class="prettyprint lang-spec">' + specText + "</pre></div>"
            	);
            	specClicks[pref+'links-click'] = (function(elem, e) {
                    var aTypeId = $(elem).data('typeid');
                    self.trigger('showSpecElement', 
                    		{
                    			kind: "type", 
                    			id : aTypeId,
                    			token: options.token,
                    			event: e
                    		});
                });
            	prettyPrint();
            	var timeLst = function(event) {
            		var h1 = container.is(":hidden");
            		if (h1) {
            			clearInterval(self.timer);
            			return;
            		}
            		var elem = $('#'+pref+'specdiv');
            		var h2 = elem.is(":hidden");
            		if (h2)
            			return;
            		var diff = container.height() - elem.height() - 41;
            		if (Math.abs(diff) > 10)
            			elem.height(container.height() - 41);
                };
            	self.timer = setInterval(timeLst, 1000);
            	
            	////////////////////////////// Sub-types Tab //////////////////////////////
            	$('#'+pref+'subs').append('<table cellpadding="0" cellspacing="0" border="0" id="'+pref+'subs-table" \
                		class="table table-bordered table-striped" style="width: 100%;"/>');
            	var subsData = [];
            	for (var i in data.used_type_defs) {
            		var aTypeId = data.used_type_defs[i];
            		var aTypeName = aTypeId.substring(0, aTypeId.indexOf('-'));
            		var aTypeVer = aTypeId.substring(aTypeId.indexOf('-') + 1);
            		subsData[subsData.length] = {name: '<a onclick="specClicks[\''+pref+'subs-click\'](this,event); return false;" data-typeid="'+aTypeId+'">'+aTypeName+'</a>', ver: aTypeVer};
            	}
                var subsSettings = {
                        "sPaginationType": "full_numbers",
                        "iDisplayLength": 10,
                        "aoColumns": [{sTitle: "Type name", mData: "name"}, {sTitle: "Type version", mData: "ver"}],
                        "aaData": [],
                        "oLanguage": {
                            "sSearch": "Search type:",
                            "sEmptyTable": "No types used by this type."
                        }
                    };
                var subsTable = $('#'+pref+'subs-table').dataTable(subsSettings);
                subsTable.fnAddData(subsData);
                specClicks[pref+'subs-click'] = (function(elem, e) {
                    var aTypeId = $(elem).data('typeid');
                    self.trigger('showSpecElement', 
                    		{
                    			kind: "type", 
                    			id : aTypeId,
                    			token: options.token,
                    			event: e
                    		});
                });
            	
            	////////////////////////////// Versions Tab //////////////////////////////
            	$('#'+pref+'vers').append('<table cellpadding="0" cellspacing="0" border="0" id="'+pref+'vers-table" \
                		class="table table-bordered table-striped" style="width: 100%;"/>');
            	var versData = [];
            	for (var i in data.func_vers) {
            		var aFuncId = data.func_vers[i];
                	var aFuncVer = aFuncId.substring(aFuncId.indexOf('-') + 1);
                	var link = null;
                	if (funcVer === aFuncVer) {
                		link = aFuncId;
                	} else {
                		link = '<a onclick="specClicks[\''+pref+'vers-click\'](this,event); return false;" data-funcid="'+aFuncId+'">'+aFuncId+'</a>';
                	}
            		versData[versData.length] = {name: link};
            	}
                var versSettings = {
                        "sPaginationType": "full_numbers",
                        "iDisplayLength": 10,
                        "aoColumns": [{sTitle: "Function version", mData: "name"}],
                        "aaData": [],
                        "oLanguage": {
                            "sSearch": "Search version:",
                            "sEmptyTable": "No versions registered."
                        }
                    };
                var versTable = $('#'+pref+'vers-table').dataTable(versSettings);
                versTable.fnAddData(versData);
                specClicks[pref+'vers-click'] = (function(elem, e) {
                    var aFuncId = $(elem).data('funcid');
                    self.trigger('showSpecElement', 
                    		{
                    			kind: "function", 
                    			id : aFuncId,
                    			token: options.token,
                    			event: e
                    		});
                });

            }, function(data) {
            	$('.loader-table').remove();
                self.$elem.append('<p>[Error] ' + data.error.message + '</p>');
                return;
            });
            
            return this;
        },
        
        getData: function() {
            return {
                type: "KBaseSpecFunctionCard",
                id: this.options.name,
                workspace: 'specification',
                title: "Function Object Specification"
            };
        }
    });
})( jQuery );
