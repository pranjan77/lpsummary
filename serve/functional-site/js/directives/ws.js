
/*
 *  Workspace Directives
 *  
 *   This file has the left hand (wsselector)
 *   and right hand (objtable) directives of the workspace
 *   browser.
 *
*/


angular.module('ws-directives', []);
angular.module('ws-directives')
.directive('wsselector', function($location, $compile, $state, $stateParams) {
    return {
        template: '<div class="ws-selector">'+
                    '<div class="ws-selector-header">'+
                        //'<a class="show-filters">Filter <span class="caret"></span></a>'+
                        

                        '<div class="btn-toolbar ws-toolbar">'+


                            //(USER_ID ? 
                            //'<div class="btn-group btn-group-sm">'+
                            //    '<button type="button" class="btn btn-default btn-show-ws active">'+
                            //        '<span class="glyphicon glyphicon-th-large"></span>'+
                            //    '</button>'+                            
                                //'<button type="button" class="btn btn-default btn-show-fav">'+
                                //    '<span class="glyphicon glyphicon-star"></span> '+
                                //    '(<span class="favorite-count">0</span>)'+
                                //'</button>'+
                            //'</div>' : 
                            //    ''
                            //)+

                            '<div class="btn-group btn-group-sm btn-filter-ws">'+
                                '<div class="dropdown">'+
                                    '<a type="button" class="" data-toggle="dropdown">'+
                                        'Filter <span class="caret"></span>'+
                                    '</a>'+
                                    '<ul class="dropdown-menu settings-dropdown perm-filters" role="menu">'+
                                        //'<div class="checkbox pull-left">'+
                                        //    '<label><input id="ws-filter-projects" type="checkbox" value="">Narrative Projects</label>'+
                                        //'</div>'+
                                        //'<br><hr class="hr">'+
                                        '<div class="checkbox pull-left">'+
                                            '<label><input id="ws-filter-owner" type="checkbox" value="">Owner</label>'+
                                        '</div>'+
                                        '<br><br><hr class="hr">'+
                                        'Your permission:<br>'+
                                        '<div class="checkbox">'+
                                            '<label><input id="ws-filter-admin" type="checkbox" value="" checked>Admin</label>'+
                                        '</div>'+
                                        '<div class="checkbox">'+
                                          '<label><input id="ws-filter-write" type="checkbox" value="" checked>Write</label>'+
                                        '</div>'+
                                        '<div class="checkbox">'+
                                          '<label><input id="ws-filter-read" type="checkbox" value="" checked>Read</label>'+                                                                                          
                                        '</div>'+

                                    '</ul>'+

                                '</div>'+
                            '</div>'+                        
                            
                            (USER_ID ? 
                            '<div class="btn-group btn-group-sm pull-right">'+
                                '<a type="button" class="btn-new-ws">'+
                                    'New +'+
                                '</a>'+
                            '</div>' : '')+

                            '<div class="fav-toolbar" style="display: none;">'+
                                '<div class="fav-toolbar-title pull-left">Objects</div>'+
                                '<button type="button" class="btn btn-default pull-right" ng-click="clearList()">Clear</button>'+                                
                            '</div>'+

                        '</div>'+

                        //(USER_ID ? '<a class="new-ws pull-right">New+</a>' : '')+

                        '<input type="text" class="search-query" placeholder="Search Workspaces">'+
                    '</div>'+


                    '<div id="select-box" class="select-box scroll-pane">'+
                      '<table class="table table-bordered table-condensed table-hover">'+
                      '</table>'+
                    '</div>'+
                    '<div favoritesidebar style="display: none;" id="favorite-sidebar" class="scroll-pane"></div>'+
                  '</div>'
                  ,

        link: function(scope, element, attrs) {
            var perm_dict = {'a': 'Admin',
                             'r': 'Read',
                             'w': 'Write',
                             'o': 'Owner',
                             'n': 'None'};

            // Global list and dict of fetched workspaces
            var workspaces = []; 
            scope.workspace_dict = {};

            var nav_height = 100;//238;


            // This method loads the sidebar data.  
            // Note: this is only called after instantiation when sidebar needs to be refreshed
            scope.loadWSTable = function() {
                $('#select-box .table').remove();
                var table = $('<table class="table table-bordered table-condensed table-hover">')
                //var recent = $('<tr class=""><td><a ui-sref="ws.recent">Recent Narratives</a></td></tr>')
                //$compile(recent)(scope);
                //table.append(recent);
                $('#select-box').append(table)

                workspaces = []
                scope.workspace_dict = {}
                
                var p = kb.nar.get_projects()
                var prom = kb.ws.list_workspace_info({});
                $('.select-box').loading();
                $.when(prom, p).done(function(data, projects) {
                    var nar_projs = {}
                    for (var i in projects) {
                        var ws = projects[i][7];
                        nar_projs[ws] = projects[i]
                    }

                    $('.select-box').rmLoading();

                    var sorted_ws = [];
                    var owned_ws = [];
                    for (var i in data) {
                        var ws = data[i];
                        var user = ws[2];

                        //quick fix to hide search workspaces
                        if (user == "kbasesearch") continue;  

                        if (user == USER_ID) {
                            owned_ws.push(ws);
                        } else {
                            sorted_ws.push(ws)
                        }
                    }

                    var data = owned_ws.concat(sorted_ws);
                    for (var i in data) {
                        var ws = data[i];
                        var name = ws[1];
                        var user = ws[2];
                        var obj_count = ws[4];
                        var perm = ws[5];
                        var global_perm = ws[6];
                        //var short_ws = ws[0].slice(0,12) + '...'


                        //var url = "ws.id({ws:'"+name+"'})"
                        var selector = $('<tr data-perm="'+perm+
                                            '" data-global="'+global_perm+
                                            '" data-owner="'+user+'"><td class="select-ws '
                                                +($stateParams.ws == name ? 'selected-ws ' : '' )+
                                                (name in nar_projs ? 'narrative-project' : '' )+
                                            '" data-ws="'+name+'">'+
                                            '<div class="badge pull-left">'+obj_count+'</div>'+
                                            ' &nbsp;<div class="pull-left ellipsis"> '+
                                            (user == USER_ID ? '<b>'+name+'</b>': name)+'</div></td></tr>');
                        

                        selector.find('td').append('<button type="button" class="btn \
                                            btn-default btn-xs btn-ws-settings hide pull-right" data-ws="'+name+'">\
                                            <span class="glyphicon glyphicon-cog"></span></button>');

                        // event for showing settings button
                        selector.hover(function() {
                            $(this).find('.btn-ws-settings').removeClass('hide');
                        }, function() {
                            $(this).find('.btn-ws-settings').addClass('hide');
                        })
                        var blah = $(".select-box table").append(selector);

                        scope.workspace_dict[name] = ws; //store in dictionary for optimization

                        // mark as narrative project if it is (used in filtering)
                        ws.push(name in nar_projs ? true : false );
                    }

                    workspaces = data;


                    $('.scroll-pane').css('height', $(window).height()-
                        $('.ws-selector-header').height() - nav_height )
                    events();
                });
            }

            // load the content of the ws selector
            scope.loadWSTable();

            function events() {
                var filterCollapse = $('.perm-filters');
                var filterOwner = filterCollapse.find('#ws-filter-owner').change(filter);
                var filterAdmin = filterCollapse.find('#ws-filter-admin').change(filter);
                var filterWrite = filterCollapse.find('#ws-filter-write').change(filter);
                var filterRead  = filterCollapse.find('#ws-filter-read').change(filter);
                var filterProjects  = filterCollapse.find('#ws-filter-projects').change(filter);                
                //var search = filterSearch.val();

                // event for clicking on 'create new workspace'
                $('.btn-new-ws').unbind('click');
                $('.btn-new-ws').click(function() {
                    createWorkspaceModal();
                });

                $('.btn-show-fav').unbind('click');
                $('.btn-show-fav').click(function() {
                    if ($(this).hasClass('active')) return;

                    $('.btn-new-ws').fadeOut();
                    $('.btn-filter-ws').fadeOut(function() {
                        $('.fav-toolbar').show();
                    });


                    $('#select-box').toggle('slide', {
                                     direction: 'left',
                                     duration: 'fast',
                                         complete: function() {
                                         $('#favorite-sidebar').toggle('slide', {
                                             direction: 'right',
                                             duration: 'fast'
                                         });
                                     }
                                 })
                    $(this).parent().children().removeClass('active');
                    $(this).addClass('active');
                })

                $('.btn-show-ws').unbind('click');
                $('.btn-show-ws').click(function() {
                    if ($(this).hasClass('active')) return;

                    $('.fav-toolbar').hide()
                    $('.btn-new-ws').fadeIn();
                    $('.btn-filter-ws').fadeIn();


                    $('#favorite-sidebar').toggle('slide', {
                                     direction: 'right',
                                     duration: 'fast',
                                         complete: function() {
                                         $('#select-box').toggle('slide', {
                                             direction: 'right',
                                             duration: 'fast'
                                         });
                                     }
                                 })

                    $(this).parent().children().removeClass('active');
                    $(this).addClass('active');                    

                })                


                // events for search box
                $('.search-query').unbind('click');
                $('.search-query').keyup(function() {
                    $('.select-box').find('td').show();
                        var input = $(this).val();
                        $('.select-box').find('td').each(function(){
                        if ($(this).text().toLowerCase().indexOf(input.toLowerCase()) != -1) {
                            return true;
                        } else {
                            $(this).hide();
                        }
                    });
                });

                // events for filters at top of ws selector
                $('.show-filters').unbind('click');
                $('.show-filters').click(function() {
                    $(this).parent().find('.perm-filters').slideToggle(function() {

                        // if filters are shown, adjust scrollbox height.
                        if ( $('.perm-filters').css('display') == "none") {
                            $('.scroll-pane').css('height', $(window).height()-
                                $('.ws-selector-header').height() - nav_height  );                                
                        } else {
                            $('.scroll-pane').css('height', $(window).height()-
                                $('.ws-selector-header').height() - nav_height );                                
                        }

                    });
                });

                // event for selecting a workspace on the sidebar
                $('.select-ws').not('.btn-ws-settings').unbind('click');
                $('.select-ws').not('.btn-ws-settings').click(function() {
                    var ws = $(this).data('ws');
                    $('.select-ws').removeClass('selected-ws');
                    $(this).addClass('selected-ws');
                    $state.transitionTo("ws.id", {ws: ws});
                    scope.$apply();
                });

                // event for settings (manage modal) button
                $('.btn-ws-settings').unbind('click')
                $('.btn-ws-settings').click(function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    var name = $(this).parent('td').data('ws');
                    manageModal(name);
                })

                // event for resizing ws selector scroll bars //fixme
                $(window).resize(function () {
                    // only adjust of ws selector is visible
                    if ($(element).is(':visible')) {
                        setTimeout(function() {
                            $('.scroll-pane').css('height', $(window).height()
                                - $('.ws-selector-header').height() - nav_height )   
                        }, 250); 
                    }
                });

                // function that filters when a filter is selected
                function filter() {
                    $('.select-box table tr').show();
                    $('.no-ws-alert').remove()

                    var projects_cb  = filterRead.prop('checked');
                    var owner_cb = filterOwner.prop('checked');
                    var admin_cb = filterAdmin.prop('checked');
                    var write_cb = filterWrite.prop('checked');
                    var read_cb  = filterRead.prop('checked');


                    for (var i=0; i< workspaces.length; i++) {
                        var ws = workspaces[i];
                        var name = ws[1];
                        var user = ws[2];
                        var obj_count = ws[4];
                        var perm = ws[5];
                        var global_perm = ws[6];
                        var is_project = ws[10]

                        var j = i+1;

                        var show = false;
                        if (admin_cb && perm === 'a') show = true;
                        if (write_cb && perm === 'w') show = true;
                        if (read_cb && perm === 'r') show = true;

                        // these filters can be combined with the above 
                        if (!show && read_cb && global_perm === 'r') show = true;
                        if (show && owner_cb && user != USER_ID) show = false;
                        //if (show && projects_cb && is_project == false) show = false;   

                        if (!show) {
                            $('.select-box table tr:nth-child('+j+')').hide();
                        }
                    }

                    if ($('.select-box table tr:visible').length == 0) {
                        $('.select-box table').append('<tr class="no-ws-alert"><td>No Workspaces</td></tr>');
                    } 
                }


                // help tooltips
                $('.btn-ws-settings').tooltip({title: 'Workspace Settings', placement: 'right', delay: {show: 800}})                     

            } /* end events */

            function manageModal(ws_name) {
                var settings = scope.workspace_dict[ws_name];

                var isAdmin;
                if (settings[5] == 'a') {
                    isAdmin = true;
                } else {
                    isAdmin = false;
                }

                // table of meta data
                var table = $('<table class="table table-bordered table-condensed table-striped manage-table">');                
                var data = [
                    ['Name', settings[1]],
                    ['Objects', '~ ' + settings[4] ],
                    ['Owner', settings[2] ],
                    ['Your Permission', perm_dict[settings[5]] ],
                    //['Global Permission', perm_dict[settings[5]] ]
                ];
                for (var i=0; i<data.length; i++) {
                    var row = $('<tr>');
                    row.append('<td class="manage-modal-attribute"><strong>' + data[i][0] + '</strong></td>'
                            + '<td class="manage-modal-value">' + data[i][1] + '</td>');
                    table.append(row);
                }

                var content = '<div class="ws-description">\
                                    <h5>Description</h5>\
                                    <div class="descript-container"></div>\
                               </div>\
                               <div class="ws-info">\
                                    <h5>Info</h5>\
                               </div>'+
                               ( (USER_ID && settings[5] != 'n') ?
                               '<div class="ws-perms">\
                                    <h5>User Permisions</h5>\
                                    <div class="perm-container"></div>\
                               </div>' : '');

                // modal for managing workspace permissions, clone, and delete
                var permData;
                var manage_modal = $('<div></div>').kbasePrompt({
                        title : 'Manage Workspace '+
                            (USER_ID ? '<a class="btn btn-primary btn-xs btn-edit">Edit <span class="glyphicon glyphicon-pencil"></span></a>' : ''),
                        body : content,
                        modalClass : '',
                        controls : [{
                            name: 'Close',
                            type: 'default',
                            callback: function(e, $prompt) {
                                    $prompt.closePrompt();
                                }
                            }, {
                            name : 'Save',
                            type : 'primary',
                            callback : function(e, $prompt) { //Fixme: yyyeeeahh.
                                $prompt.addCover();
                                $prompt.getCover().loading();

                                var prom = savePermissions(ws_name);
                                prompt = $prompt;

                                // save permissions, then save description, then the global perm //fixme
                                $.when(prom).done(function() {
                                    // if description textarea is showing, saving description
                                    var d = $('.descript-container textarea').val();

                                    // saving description
                                    var p1 = kb.ws.set_workspace_description({workspace: ws_name, 
                                        description: d})

                                    $.when(p1).done(function() {
                                        var new_perm = $('.btn-global-perm option:selected').val();
                                        // saving global perm
                                        var p1 = kb.ws.set_global_permission({workspace: ws_name, 
                                            new_permission: new_perm})
                                        $.when(p1).done(function() {
                                            prompt.addCover('Saved.');
                                            prompt.closePrompt();
                                            manageModal(ws_name);                                            
                                        }).fail(function(e){
                                            prompt.addCover(e.error.message, 'danger');
                                        })                      
                                    }).fail(function(e){
                                        prompt.addCover(e.error.message, 'danger');
                                    })

                                }).fail(function(e){
                                    prompt.addCover(e.error.message, 'danger');
                                })
                            }
                        }]
                    })

                manage_modal.openPrompt();
                var dialog = manage_modal.data('dialogModal').find('.modal-dialog');
                dialog.css('width', '500px');
                var modal_body = dialog.find('.modal-body');  //fixme: an api to the 
                                                              // widget would be nice for this stuff
                var modal_footer = dialog.find('.modal-footer');
                var save_btn = modal_footer.find('.btn-primary');
                save_btn.attr('disabled', true);

                // add editable global permisssion
                kb.ws.get_workspace_info({workspace: ws_name}).done(function(data) {
                    var perm = data[6];
                    var row = $('<tr>');
                    row.append('<td class="manage-modal-attribute"><strong>Global Permission</strong></td>'
                            + '<td class="manage-modal-value btn-global-perm">' + perm_dict[perm] + '</td>');
                    table.append(row);

                    // event for editable global perm
                    $('.btn-edit').click(function() {
                        if ($(this).hasClass('editable')) {
                            $('.btn-global-perm').html(globalPermDropDown(perm));   
                        } else {
                            $('.btn-global-perm').html('')  //fixme: create editable form plugin
                            $('.btn-global-perm').text(perm_dict[perm]);
                        }
                    })

                    modal_body.find('.ws-info').append(table)
                }).fail(function(e){
                    modal_body.append('<div class="alert alert-danger">'+
                            '<b>Error</b> Can not fetch WS info: '+
                                e.error.message+'</div>');
                });


                // editable status
                $('.btn-edit').click(function(){
                    $(this).toggleClass('editable');

                    // if not editable, make editable
                    if ($(this).hasClass('editable')) {
                        save_btn.attr('disabled', false);  
                        $(this).html('Cancel');
                    } else {
                        save_btn.attr('disabled', true);                              
                        $(this).html('Edit');
                    }
                })

                var cloneWS = $('<button class="btn btn-link pull-left">Clone</button>');
                cloneWS.click(function() {
                    manage_modal.closePrompt();
                    cloneWorkspace(ws_name);
                });

                var deleteWS = $('<button class="btn btn-link pull-right">Delete</button>');
                deleteWS.click(function() {
                    manage_modal.closePrompt();
                    deleteWorkspace(ws_name);
                });

                // get and display editable description
                var prom = kb.ws.get_workspace_description({workspace:ws_name})
                $.when(prom).done(function(descript) {
                    var d = (descript ? descript : '(none)')+'<br>';
                    modal_body.find('.descript-container')
                        .append(d);

                    $('.btn-edit').click(function(){
                        if ($(this).hasClass('editable')) {
                            var editable = getEditableDescription(descript);
                            $('.descript-container').html(editable);
                        } else {
                            $('.descript-container').html(descript);
                        }
                    })
                }).fail(function(e){
                    modal_body.append('<div class="alert alert-danger">'+
                            '<b>Error</b> Can not fetch description: '+
                                e.error.message+'</div>');
                });


                // if user is logged in and admin
                if (USER_ID && isAdmin ) {
                    var params = {workspace: ws_name}
                    var prom = kb.ws.get_permissions(params);

                    //var newPerms;
                    var placeholder = $('<div></div>').loading()
                    modal_body.append(placeholder);                        
                    $.when(prom).done(function(data) {
                        permData = data

                        //newPerms = $.extend({},data)
                        placeholder.rmLoading();

                        perm_container = modal_body.find('.perm-container');

                        var perm_table = getPermTable(data)
                        perm_container.append(perm_table);

                        $('.btn-edit').click(function() {
                            if ($(this).hasClass('editable')) {
                                perm_table.remove();
                                perm_table = getEditablePermTable(data);
                                perm_container.html(perm_table);
                            } else {
                                perm_table.remove();
                                perm_table = getPermTable(data);
                                perm_container.html(perm_table);
                            }
                        })

                        modal_body.append(cloneWS);
                        modal_body.append(deleteWS);
                    }).fail(function(e){
                        modal_body.append('<div class="alert alert-danger">'+
                            '<b>Error:</b> Can not fetch WS permissions: '+
                                e.error.message+'</div>');
                });
                }




                function getEditableDescription(d) {
                    var d = $('<form role="form">\
                               <div class="form-group">\
                                <textarea rows="4" class="form-control" placeholder="Description">'+d+'</textarea>\
                              </div>\
                              </form>');
                    return d;
                }

                //table for displaying user permissions
                function getPermTable(data) {
                    var table = $('<table class="table table-bordered perm-table"></table>');
                    // if there are no user permissions, display 'none'
                    // (excluding ~global 'user' and owner)
                    var perm_count = Object.keys(data).length;

                    if (perm_count <= 1 || (perm_count == 2 && '*' in data)) {
                        var row = $('<tr><td>(None)</td></tr>');
                        table.append(row);
                        return table;
                    }


                    // create table of permissions
                    for (var key in data) {
                        // ignore user's perm, ~global, and users with no permissions
                        if (key == '*' || key == USER_ID || data[key] == 'n') continue;
                        var row = $('<tr><td class="perm-user" data-user="'+key+'">'+key+'</td><td class="perm-value" data-value="'+data[key]+'">'+
                                         perm_dict[data[key]]+'</td></tr>');

                        table.append(row);
                    }

                    return table;
                }

                // table for editing user permissions
                function getEditablePermTable(data) {
                    var table = $('<table class="table table-bordered edit-perm-table"></table>');

                    // create table of permissions
                    for (var key in data) {
                        // ignore user's perm, ~global, and users with no permissions
                        if (key == '*' || key == USER_ID || data[key] == 'n') continue;
                        var row = $('<tr><td><input type="text" class="form-control perm-user" value="'+key+'"></input></td>\
                            <td class="perm-value">'+permDropDown(data[key])+'</td>\
                            <td><button class="form-control rm-perm" data-user="'+key+'">\
                            <span class="glyphicon glyphicon-trash"></span></button></tr>');

                        row.find('.rm-perm').click(function(){
                            $(this).closest('tr').remove();                            
                        });

                        table.append(row);
                    }

                    // if there are no user permissions, display 'none'
                    // (excluding ~global 'user' and owner)
                    var perm_count = Object.keys(data).length;
                    if (perm_count == 2) {
                        var row = $('<tr>None</tr>');
                        table.append(row);
                    }                    

                    var newrowhtml = '<tr class="perm-row"><td><input type="text" class="form-control perm-user" placeholder="Username"></td><td>'+
                            permDropDown(data[key])+'</td></tr>'
                    var row = $(newrowhtml);

                    var addOpt = $('<td><button type="button" class="form-control add-perm">\
                        <span class="glyphicon glyphicon-plus" aria-hidden="true"></span></button></td>');
                    row.append(addOpt);
                    table.append(row);
                    
                    table.find('.add-perm').click(function() {
                        var new_user_id = $(this).parents('tr').find('.perm-user').val();
                        var new_perm = $(this).parents('tr').find('.create-permission option:selected').val();
                        //newPerms[new_user_id] = new_perm; //update model

                        newRow(new_user_id, new_perm);

                        $(this).parents('tr').find('.perm-user').val('')

                        if (table.find('tr').length == 0) {
                           table.append('<tr>None</tr>');
                        }
                    });

                    function newRow(new_user_id, new_perm) {  //onchange="newPerms[\''+new_user_id+'\'] = $(this).find(\'option:selected\').val();
                        var rowToAdd = '<tr><td><input class="form-control perm-user" value="'+new_user_id+'"></input></td>\
                                <td class="perm-value">'+permDropDown(data[key], new_perm)+'</td>\
                                <td><button onclick="$(this).closest(&#39;tr&#39).remove();" class="form-control">\
                                <span class="glyphicon glyphicon-trash"></span></button></tr>';

                        // add new row
                        table.find('tr:last').before(rowToAdd);
                    }

                    return table;
                }


                function savePermissions(p_name) {
                    var newPerms = {};
                    var table = $('.edit-perm-table');
                    table.find('tr').each(function() {
                        var user = $(this).find('.perm-user').val()
                        var perm = $(this).find('option:selected').val();
                        if (!user) return;
                        
                        newPerms[user] = perm
                    })

                    // create new permissions for each user that does not currently have 
                    // permsissions.
                    var promises = [];
                    for (var new_user in newPerms) {
                        // ignore these
                        if (new_user == '*' || new_user == USER_ID) continue;   

                        // if perms have not change, do not request change
                        if ( (new_user in permData) && newPerms[new_user] == permData[new_user]) {
                            continue;
                        }


                        var params = {
                            workspace: p_name,
                            new_permission: newPerms[new_user],
                            users: [new_user],
                            //auth: USER_TOKEN
                        };

                        var p = kb.ws.set_permissions(params);
                        promises.push(p);
                    };

                    var rm_users = [];

                    // if user was removed from user list, change permission to 'n'
                    for (var user in permData) {
                        if (user == '*' || user == USER_ID) continue;                            

                        if ( !(user in newPerms) ) {

                            var params = {
                                workspace: p_name,
                                new_permission: 'n',
                                users: [user],
                                //auth: USER_TOKEN
                            };

                            var p = kb.ws.set_permissions(params);
                            promises.push(p);
                            rm_users.push(user)
                        } 
                    }

                    return $.when.apply($, promises);
                }                    

                // dropdown for user permissions (used in getPermission Table) //fixme: cleanup
                function permDropDown(perm) {
                    var dd = $('<select class="form-control create-permission" data-value="n">\
                                    <option value="r">read</option>\
                                    <option value="w">write</option>\
                                    <option value="a">admin</option></select>\
                                  </div>');

                    if (perm == 'a') {
                        dd.find("option[value='a']").attr('selected', 'selected');
                    } else if (perm == 'w') {
                        dd.find("option[value='w']").attr('selected', 'selected');                
                    } else {
                        dd.find("option[value='r']").attr('selected', 'selected');                           
                    }

                    return $('<div>').append(dd).html();
                }

            }  // end manageModal


            function globalPermDropDown(perm) {
                var dd = $('<select class="form-control create-permission" data-value="n">\
                                <option value="n">None</option>\
                                <option value="r">Read</option>\
                            </select>')
                if (perm == 'n') {
                    dd.find("option[value='n']").attr('selected', 'selected');
                } else if (perm == 'r') {
                    dd.find("option[value='r']").attr('selected', 'selected');                        
                } else {
                    dd.find("option[value='n']").attr('selected', 'selected');
                }

                return $('<div>').append(dd).html();
            }


            function createWorkspaceModal() {
                var body = $('<form class="form-horizontal" role="form">\
                                  <div class="form-group">\
                                    <label class="col-sm-4 control-label">Workspace Name</label>'+
                                    '<div class="col-sm-6">'+                                 
                                        '<div class="input-group">'+
                                            '<span class="input-group-addon">'+USER_ID+':</span>'+
                                            '<input type="text" class="form-control create-id focusedInput">'+
                                        '</div>'+
                                    '</div>\
                                  </div>\
                                  <div class="form-group">\
                                    <label class="col-sm-4 control-label">Global Permission</label>\
                                    <div class="col-sm-3">'+
                                        globalPermDropDown('n')+
                                    '</div>\
                                  </div>\
                                  <div class="form-group">\
                                    <label class="col-sm-4 control-label">Description</label>\
                                    <div class="col-sm-7">\
                                      <textarea class="form-control create-descript" rows="3"></textarea>\
                                    </div>\
                                  </div>\
                              </div>')
                

                var createModal = $('<div></div>').kbasePrompt({
                        title : 'Create Workspace',
                        body : body,
                        modalClass : '', 
                        controls : ['cancelButton', {
                            name : 'Create',
                            type : 'primary',
                            callback : function(e, $prompt) {
                                    var ws_name = $('.create-id').val();
                                    var perm = $('.create-permission option:selected').val();
                                    var descript = $('.create-descript').val();



                                    if (ws_name === '') {
                                        $prompt.addAlert('must enter a workspace name');
                                        $('.create-id').focus();
                                        return;
                                    }                   

                                    // check to see if there's a colon in the user project name already
                                    // if there is and it's the user's username, use it. If it's not throw error.
                                    // Otherwise, append "username:"
                                    var s_ws = ws_name.split(':');
                                    var error;
                                    if (s_ws.length > 1) {
                                        if (s_ws[0] == USER_ID) {
                                            var proj = USER_ID+':'+s_ws[1];
                                        }  else {
                                            error = 'Only your username ('+USER_ID+') may be used before a colon';
                                            
                                        }
                                    } else {
                                        var name = USER_ID+':'+ws_name
                                    }

                                    if (error) {
                                        $prompt.addCover(error, 'danger');
                                    } else {
                                        var params = {
                                            workspace: name,
                                            globalread: perm,
                                            description: descript
                                        };                                            
                                        var prom = kb.ws.create_workspace(params);
                                        $prompt.data('dialogModal').find('.modal-body').loading()
                                        $.when(prom).done(function(){                                            
                                            scope.loadWSTable();
                                            kb.ui.notify('Created workspace: '+ws_name, 'success');                                            
                                            $prompt.closePrompt(); 

                                            $prompt.data('dialogModal').find('.modal-footer').html(btn);                                            
                                        }).fail(function(e) {
                                            $prompt.data('dialogModal').find('.modal-body').rmLoading()
                                            $prompt.addCover(e.error.message, 'danger');                                            
                                        })
                                    }
                            }
                        }]
                    }
                );

                createModal.openPrompt();
            }

            function cloneWorkspace(ws_name) {
                var body = $('<form class="form-horizontal" role="form">\
                                  <div class="form-group">\
                                    <label class="col-sm-5 control-label">New Workspace Name</label>\
                                    <div class="col-sm-4">\
                                      <input type="text" class="form-control new-ws-id">\
                                    </div>\
                                  </div>\
                                  <div class="form-group">\
                                    <label class="col-sm-5 control-label">Permission</label>\
                                    <div class="col-sm-3">\
                                     <select class="form-control create-permission" data-value="n">\
                                        <option value="n" selected="selected">none</option>\
                                        <option value="r">read</option></select>\
                                    </div>\
                                  </div>\
                              </div>');
                

                var cloneModal = $('<div class="kbase-prompt"></div>').kbasePrompt({
                        title : 'Clone Workspace',
                        body : body,
                        modalClass : '', 
                        controls : [{
                            name: 'Cancel',
                            type: 'default',
                            callback: function(e, $prompt) {
                                    $prompt.closePrompt();
                                    manageModal(ws_name);
                                }
                            },
                            {
                            name : 'Clone',
                            type : 'primary',
                            callback : function(e, $prompt) {
                                    var new_ws_id = $('.new-ws-id').val();
                                    var perm = $('.create-permission option:selected').val();


                                    var params = {
                                        wsi: {workspace: ws_name},
                                        workspace: new_ws_id,
                                        globalread: perm
                                    };

                                    if (new_ws_id === '') {
                                        $prompt.addAlert('must enter');
                                        $('.new-ws-id').focus();
                                        return;
                                    }                   

                                    var prom = kb.ws.clone_workspace(params);
                                    $prompt.addCover()
                                    $prompt.getCover().loading()
                                    $.when(prom).done(function(){
                                        scope.loadWSTable();
                                        kb.ui.notify('Cloned workspace: <i>'+new_ws_id+'</i>');
                                        $prompt.closePrompt();
                                    }).fail(function() {
                                        $prompt.addCover('This workspace name already exists.', 'danger');
                                    })

                            }
                        }]
                    }
                )

                cloneModal.openPrompt();
            }

            function deleteWorkspace(ws_name) {
                var body = $('<div style="text-align: center;">Are you sure you want to delete this workspace?<h3>'
                                +ws_name+'</h3>This action is irreversible.</div>');

                var deleteModal = $('<div></div>').kbasePrompt({
                        title : 'Delete Workspace',
                        body : body,
                        modalClass : '', 
                        controls : [{
                            name: 'No',
                            type: 'default',
                            callback: function(e, $prompt) {
                                    $prompt.closePrompt();
                                    manageModal(ws_name);
                                }
                            },
                            {
                            name : 'Yes',
                            type : 'primary',
                            callback : function(e, $prompt) {
                                var params = {workspace: ws_name}

                                var prom = kb.ws.delete_workspace(params);
                                $prompt.addCover()
                                $prompt.getCover().loading()
                                $.when(prom).done(function(){
                                    scope.loadWSTable();
                                    kb.ui.notify('Deleted workspace: <i>'+ws_name+'</i>');
                                    $prompt.closePrompt();
                                }).fail(function() {
                                    $prompt.addCover('Could not delete workspace.', 'danger');
                                })

                            }
                        }]
                    }
                );
                deleteModal.openPrompt();
                deleteModal.addAlert('<strong>Warning</strong> All objects in the workspace will be deleted!');
            }
        }  /* end link */
    };
})


.directive('objtable', function($location, $compile, favoriteService) {
    return {
        link: function(scope, element, attrs) {
            var ws = scope.selected_ws;
            var showObjOpts = false;


            var table;

            // stars in table
            scope.favs;

            scope.checkedList = [];

            scope.updateFavStars = function() {
                $xml.find("td").each(function(index){        
                    var row =             
                    oTable.fnUpdate( [c1, c2, c3], index ); // Row
                });  
            }

            scope.$watch('checkedList', function() {
                $('.obj-check-box').each(function() {
                    var c = scope.checkedList;
                    var found = false
                    for (var i in c) {
                        if (c[i].id == $(this).data('id')
                            && c[i].ws == $(this).data('ws')
                            && c[i].type == $(this).data('type') ){
                            $(this).addClass('ncheck-checked');
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        $(this).removeClass('ncheck-checked')
                    }
                })

                var count = (scope.checkedList.length ? scope.checkedList.length : '');
                $('.checked-count').text(count);

                if (scope.checkedList.length == 1) {
                    $('.object-options, .btn-rename-obj').removeClass('hide');
                } else if (scope.checkedList.length > 1) {
                    $('.object-options').removeClass('hide');
                    // hide options that can only be done on 1 object at a time
                    $('.btn-rename-obj').addClass('hide');
                } else {
                    $('.object-options').addClass('hide');
                }
            }, true)

            function removeCheck(id, ws, type) {
                var c = scope.checkedList
                for (var i = 0; i < c.length; i++) {

                    if (c[i].id == id 
                        && c[i].ws == ws
                        && c[i].type == type) {
                        c.splice(i,1);
                        scope.$apply();
                    }
                }
            }

            scope.loadObjTable = function() {
                showObjOpts = false;
                var table_id = "obj-table-"+ws.replace(':',"_");                    

                var columns =  [ (USER_ID ? { "sTitle": '<div class="ncheck check-option btn-select-all">'
                                            +'</div>',
                                             bSortable: false, "sWidth": "1%"} 
                                          : { "sTitle": '', bVisible: false, "sWidth": "1%"}),
                                { "sTitle": "Name"}, //"sWidth": "10%"
                                { "sTitle": "Type"},
                                { "sTitle": "Last Modified", "iDataSort": 5},
                                { "sTitle": "Owner", bVisible: true},
                                { "sTitle": "Timestamp", "bVisible": false, "sType": 'numeric'},
                                { "sTitle": "Size", iDataSort: 7 },
                                { "sTitle": "Byte Size", bVisible: false },
                                { "sTitle": "Module", bVisible: false }];

                var tableSettings = {
                    "sPaginationType": "bootstrap",
                    "bStateSave": true,
                    "fnStateSave": function (oSettings, oData) {
                        if (USER_ID) {   
                            save_dt_view(oSettings, oData);
                        }
                    },
                    "fnStateLoad": function (oSettings) {
                        if (USER_ID) {
                            return load_dt_view(oSettings);
                        }
                    },
                    "oColReorder": {
                        "iFixedColumns": (USER_ID ? 1 :0 ),
                    },
                    "iDisplayLength": 100,
                    "aaData": [],
                    "fnDrawCallback": events,
                    "aaSorting": [[ 3, "desc" ]],
                    "aoColumns": columns,
                    "oLanguage": {
                        "sEmptyTable": "No objects in workspace",
                        "sSearch": "Search: "
                    }
                }


                // clear object view every load
                $(element).html('')
                $(element).loading('loading '+ws+'...')



                var p = kb.ws.list_objects({workspaces: [ws]});
                var p2 = kb.ws.list_objects({workspaces: [ws], showOnlyDeleted: 1});
                var p3 = (USER_ID ? kb.ujs.get_has_state('favorites', 'queue', 0) : undefined);
                var p4 = $.getJSON('landing_page_map.json');

                $.when(p, p2, p3, p4).done(function(objs, deleted_objs, favs, obj_mapping){
                    if (favs) {
                        scope.favs = (favs[0] == 1 ? favs[1] : []);                        
                    }

                    scope.deleted_objs = deleted_objs;
                    scope.obj_mapping = obj_mapping[0];

                    $(element).rmLoading();

                    $(element).append('<table id="'+table_id+'" \
                        class="table table-bordered table-striped" style="width: 100%;"></table>')    

                    // format and create object datatable
                    var tableobjs = formatObjs(objs, obj_mapping);
                    var wsobjs = tableobjs[0];
                    var kind_counts = tableobjs[1];
                    tableSettings.aaData = wsobjs;
                    table = $('#'+table_id).dataTable(tableSettings);       
                    $compile(table)(scope);

                    // reset filter; critical for ignoring cached filter
                    console.log(scope.type)
                    table.fnFilter((scope.type ? scope.type+'-.*' : ''), getCols(table, 'Type'), true)

                    // add trashbin
                    var trash_btn = getTrashBtn();
                    $('.dataTables_filter').after(trash_btn);

                    // add show/hide column settings button
                    var settings_btn = getSettingsBtn(table)
                    $('.table-options').append(settings_btn);
                    // ignore close on click inside of *any* settings button
                    $('.settings-dropdown').click(function(e) {
                        e.stopPropagation();
                    });                    


                    // show these options if logged in.
                    if (USER_ID) {
                        trash_btn.removeClass('hide');
                    }

                    // if there are objects add type filter,
                    if (objs.length) {
                        var type_filter = getTypeFilterBtn(table, kind_counts, scope.type)
                        $('.table-options').append(type_filter);
                    }

                    //searchColumns()
                    addOptionButtons();

                    // resinstantiate all events.
                    events();

                }).fail(function(e){
                    $(element).html('<div class="alert alert-danger">'+e.error.message+'</div>');
                })

            } // end scope.loadObjTable

            // call on load
            scope.loadObjTable();

            function getSettingsBtn(table) {
                var settings_btn = $('<div class="btn-table-settings dropdown pull-left">'+
                          '<a class="btn btn-default" data-toggle="dropdown">'+
                            '<span class="glyphicon glyphicon-cog"></span> <span class="caret"></span>'+
                          '</a>'+
                        '</div>');

                var dd = $('<ul class="dropdown-menu settings-dropdown" role="menu"></ul>');

                dd.append('Columns:<br>');
                settings_btn.append(dd);

                var cols = getCols(table)
                for (var i in cols) {
                    if (cols[i].sTitle.indexOf('ncheck') != -1) continue;  // ignore checkbox col
                    dd.append('<div class="btn-settings-opt">'+
                                 '<label><input type="checkbox" data-col="'+cols[i].sTitle+'" '+
                                        (cols[i].bVisible == false ? '' : 'checked="checked"')+ 
                                 '> '+cols[i].sTitle+'</label>\
                               </div>');
                }
                dd.append('<hr class="hr">')
                var reset_btn = $('<button class="btn btn-default btn-settings-opt">Default Settings</button>')

                dd.append(reset_btn)

                dd.find('input').change(function() {
                    var col_name = $(this).data('col')
                    fnShowHide(table, col_name);
                }) 
                reset_btn.click( function () {
                    reset_dt_view()
                    scope.loadObjTable();
                } );

                return settings_btn;
            }

            function getTypeFilterBtn(table, type_counts, selected) {
                var type_filter = $('<select class=" type-filter form-control">\
                                    <option selected="selected">All Types</option> \
                                </select>')
                for (var type in type_counts) {
                    type_filter.append('<option data-type="'+type+'" '+
                                    (type == selected ? 'selected' : '')+
                                    '>'+type+'  ('+type_counts[type]+')</option>'); 
                }
                type_filter.change( function () {
                    var curr = getCols(table, 'Type')
                    if ($(this).val() == "All Types") {
                        // look for type column (init column 2) in current order
                        table.fnFilter('', curr)
                    } else {
                        table.fnFilter( $(this).find('option:selected').data('type')+'-.*', curr, true);
                    }    
                });

                return type_filter;
            }

            function getTrashBtn() {
                var trash_btn = $('<a class="btn-trash pull-right hide">Trash \
                            <span class="badge trash-count">'+scope.deleted_objs.length+'</span><a>');
                trash_btn.tooltip({title: 'View trash bin', placement: 'bottom', delay: {show: 700}});

                trash_btn.click(function(){
                    displayTrashBin()
                })      

                return trash_btn;          
            }

            function fnShowHide(table, col_name ){
                var cols = table.fnSettings().aoColumns;
                var bVis;
                for (i=0; i<cols.length; i++) {
                    if (cols[i].sTitle == col_name) {
                        bVis = cols[i].bVisible;
                        break;
                    }
                }
                table.fnSetColumnVis( i, bVis ? false : true );
            }

            // function that takes json for the object table and formats
            function formatObjs(objs, obj_mapping) {
                var wsobjs = []
                var kind_counts = {}

                for (var i in objs) {
                    var obj = objs[i];
                    var objid = obj[0]
                    var id = obj[1];
                    var full_type = obj[2];
                    var module = full_type.split('.')[0];
                    var type = full_type.slice(full_type.indexOf('.')+1);
                    var kind = type.split('-')[0];
                    var timestamp = kb.ui.getTimestamp(obj[3].split('+')[0]);
                    var date = kb.ui.formateDate(timestamp);
                    var instance = obj[4];
                    var owner = obj[5];
                    var wsid = obj[6];
                    var ws = obj[7];
                    var bytesize = obj[9];
                    var size = readableSize(bytesize);

                    var check = '<div class="ncheck obj-check-box check-option"'
                            + ' data-ws="' + ws + '"'
                            + ' data-type="' + type + '"'
                            + ' data-module="' + module + '"'
                            + ' data-id="' + id + '"></div>';

                    var wsarray = [check, 
                                   id,
                                   type,
                                   date,
                                   owner,
                                   timestamp,
                                   size,
                                   bytesize,
                                   module];

                    if (kind in kind_counts) {
                        kind_counts[kind] = kind_counts[kind] + 1;
                    } else {
                        kind_counts[kind] = 1;
                    }

                    // determine if saved to favorites
                    var isFav = false;
                    for (var i in scope.favs) { 
                        if (scope.favs[i].ws != ws) continue;
                        if (scope.favs[i].id == id) {
                            isFav = true;
                            break;
                        } 
                    }

                    // get url path specified in landing_page_map.json
                    if (module in scope.obj_mapping && scope.obj_mapping[module] 
                        && scope.obj_mapping[module][kind] ) {
                        var sub = scope.obj_mapping[module][kind];
                    } else {
                        var sub = undefined
                    }                    

                    //var sortable = ['FBAModel', 'FBA'];
                    //var mv = ['Media', 'MetabolicMap', 'ETC'];
                    //var route = (sortable.indexOf(kind) != -1 ? 'ws.mv' : sub)  //+sub : sub);
                    var route = sub;
                    switch (kind) {
                        case 'FBA': 
                            route = 'ws.fbas';
                            break;
                        case 'FBAModel': 
                            route = 'ws.mv.model';
                            break;
                        case 'Media': 
                            route = 'ws.media';
                            break;
                        case 'MetabolicMap': 
                            route = 'ws.maps';
                            break;
                        case 'Media': 
                            route = 'ws.media';
                            break; 
                        case 'Genome': 
                            route = 'genomesbyid';
                            break;                             
                    }


                    if (route) {
                        var url = route+"({ws:'"+ws+"', id:'"+id+"'})";
                        var new_id = '<a class="obj-id" data-ws="'+ws+'" data-id="'+id+'"'+
                                        'data-type="'+type+'" data-kind="'+kind+'" data-module="'+module+'" '+
                                        'data-sub="'+sub+'" ui-sref="'+url+'" >'+
                                    id+'</a> (<a class="show-versions">'+instance+'</a>)'+
                                    (isFav ? ' <span class="glyphicon glyphicon-star btn-fav"></span>': '')+
                                    '<a class="btn-show-info hide pull-right">More</a>';

                    } else {
                        var url = "ws.json({ws:'"+ws+"', id:'"+id+"'})"
                        var new_id = '<a class="obj-id" data-ws="'+ws+'" data-id="'+id+'"'+
                                        'data-type="'+type+'" data-kind="'+kind+'" data-module="'+module+'" '+
                                        'data-sub="'+sub+'" ui-sref="'+url+'" >'+
                                      id+'</a> (<a class="show-versions">'+instance+'</a>)'+
                                      (isFav ? ' <span class="glyphicon glyphicon-star btn-fav"></span>': '')+                                            
                                     '<a class="btn-show-info hide pull-right">More</a>';
                    }

                    wsarray[1] = new_id;
                    wsobjs.push(wsarray);
                }
                return [wsobjs, kind_counts];
            }


            // events for object table.  
            // This is reloaded on table change/pagination
            function events() {
                $compile(table)(scope);

                // ignore other events when clicking landingpage href
                $('.obj-id').click(function(e) {
                    e.stopPropagation();
                })


                // events for favorite (start) button
                $('.btn-fav').hover(function() {
                    $(this).addClass('glyphicon-star-empty');
                }, function() {
                    $(this).removeClass('glyphicon-star-empty');
                })

                $('.btn-fav').unbind('click');
                $('.btn-fav').click(function(e) {
                    e.stopPropagation();

                    var link = $(this).parent('td').find('.obj-id');
                    var id = link.data('id');
                    var ws = link.data('ws');
                    var type = link.data('type');

                    $('.fav-loading').loading();
                    var p = favoriteService.remove(ws, id, type);

                    $.when(p).done(function(){
                        scope.updateFavs();
                    });
                    $(this).remove()

                })

                // event for objtect 'more' button
                $('.btn-show-info').unbind('click');
                $('.btn-show-info').click(function(e) {
                    e.stopPropagation();
                    var id = $(this).parent('td').find('.obj-id').data('id');
                    showObjectInfo(ws, id);
                })

                // event for showing object history
                $('.show-versions').unbind('click')
                $('.show-versions').click(function(e) {
                    e.stopPropagation();
                    var type = $(this).prev('.obj-id').data('type');
                    var id = $(this).prev('.obj-id').data('id');
                    showObjectVersions(ws, id);
                })

                // help tooltips
                $('.show-versions').tooltip({title: 'Show history', placement: 'bottom', delay: {show: 700}});
                $('.obj-id').tooltip({title: 'View object', placement: 'bottom', delay: {show: 700}});
                $('.btn-show-info').tooltip({title: 'Meta data/spec, download, etc.', placement: 'bottom', delay: {show: 700}});

                checkBoxObjectClickEvent();
            }


            // event for when an object is checked
            function checkBoxObjectClickEvent() {
                // if select all checkbox was clicked
                $('.btn-select-all').unbind('click') 
                $('.btn-select-all').click(function(){
                    // if select all button is already checked, removed all checked
                    if ($(this).hasClass('ncheck-checked')) {
                        $('.obj-check-box').removeClass('ncheck-checked');
                        $(this).removeClass('ncheck-checked');
                        scope.checkedList = [];
                        scope.$apply();
                    // otherwise, check all
                    } else {
                        $('.obj-check-box').addClass('ncheck-checked');
                        $(this).removeClass('ncheck-minus');
                        $(this).addClass('ncheck-checked');

                        scope.checkedList = [];
                        $('.obj-check-box').each(function(){
                            var id = $(this).attr('data-id');
                            var dataWS = $(this).attr('data-ws');
                            var dataType = $(this).attr('data-type');
                            var module = $(this).attr('data-module');                            
                            scope.checkedList.push({id: id, ws: dataWS, type: dataType, module:module });
                            scope.$apply();
                        })
                    }

                    if (!showObjOpts){
                        objOptClick();
                        showObjOpts = true;
                    }
                    if (scope.checkedList.length == 0){
                        showObjOpts = false;                            
                    } 
                })

                // effect for highlighting checkbox on hover
                $('.obj-table tbody tr').hover(function() {
                    $(this).children('td').eq(0).find('.ncheck').addClass('ncheck-hover');
                    $(this).find('.btn-show-info').removeClass('hide');
                }, function() {
                    $(this).children('td').eq(0).find('.ncheck').removeClass('ncheck-hover');
                    $(this).find('.btn-show-info').addClass('hide');
                })

                // checkbox click event
                $('.obj-table tbody tr').unbind('click');
                $('.obj-table tbody tr').click(function(e) {
                    if (!USER_ID) return;
                    var checkbox = $(this).children('td').eq(0).find('.ncheck');
                    var id = checkbox.attr('data-id');
                    var dataWS = checkbox.data('ws');
                    var dataType = checkbox.data('type');
                    var module = checkbox.data('module');

                    if (checkbox.hasClass('ncheck-checked')) {
                        removeCheck(id, dataWS, dataType)
                    } else {
                        scope.checkedList.push({id: id, ws: dataWS, type: dataType, module: module});
                        scope.$apply();
                    }

                    if (!showObjOpts) {
                        objOptClick();
                        showObjOpts = true;
                    }

                    if (scope.checkedList.length == 0){
                        $('.btn-select-all').removeClass('ncheck-checked');                            
                        showObjOpts = false;
                    } 
                })

            }

            function addOptionButtons() {
                var options = $('<span class="object-options hide"></span>');

                var delete_btn = $('<button class="btn btn-danger btn-delete-obj">\
                    <span class="glyphicon glyphicon-trash"></span></button>')

                var copy_btn = $('<span class="dropdown"><button class="btn btn-default btn-mv-dd" \
                                    data-toggle="dropdown">\
                                <span class="glyphicon glyphicon-folder-open"></span>\
                                <span class="caret"></span></button>\
                                <ul class="dropdown-menu" role="menu">\
                                    <li><a class="btn-cp-obj">Copy</a></li>\
                                </ul></span>');

                var rename_btn = $('<button class="btn btn-default btn-rename-obj">\
                    <span class="glyphicon glyphicon-edit"></span></button>');

                var mv_btn = $('<button class="btn btn-default">\
                    <span class="glyphicon glyphicon-star"></span>\
                    <span class="checked-count"></span></button>');                                      

                options.append(delete_btn, copy_btn, rename_btn)//, mv_btn);


                // if user has narrative home workspace, add option to copy there
                if (scope.workspace_dict[USER_ID+':home']) {
                    var dd = options.find('.dropdown-menu')
                    dd.append('<li class="divider"></li>');
                    dd.append('<li><a class="btn-mv-obj-to-nar">Copy to Narrative Home</a></li>');
                }

                //options.find('.btn-mv-obj').on('click', moveObjects);
                copy_btn.find('.btn-cp-obj').on('click', copyObjects);
                copy_btn.find('.btn-mv-obj-to-nar').on('click', copyObjectsToNarrative);                                        
                rename_btn.on('click', renameObject);
                mv_btn.on('click', addToMV);

                var container = $('.table-options').append(options);
                //options.addClass('hide')

                delete_btn.tooltip({title: 'Delete selected objects', placement: 'bottom', delay: {show: 700}});
                //copy_btn.tooltip({title: 'Copy; click for options', placement: 'bottom', delay: {show: 700}});  
                rename_btn.tooltip({title: 'Rename (first) selected object', placement: 'bottom', delay: {show: 700}})                                      
            }

            // events for top row options on objects, after checked
            function objOptClick() {
                $('.btn-delete-obj').unbind('click')
                $('.btn-delete-obj').click(function(){
                    deleteObjects()
                });

                $('.opt-dropdown ul li').unbind('click')
                $('.opt-dropdown ul li').click(function(){
                    if ($(this).attr('opt') == 'copy'){
                        copyObjects();
                    } else if ($(this).attr('opt') == 'move'){
                        moveObjects();
                    }
                })
            }

            function showObjectVersions(ws, id) {
                var historyModal = $('<div class="history-modal"></div>').kbasePrompt({
                        title : 'History of '+id,
                        modalClass : '', 
                        controls : ['cancelButton']
                    }
                );

                historyModal.openPrompt();
                var modal_body = historyModal.data('dialogModal').find('.modal-body').loading();
                historyModal.data('dialogModal').find('.modal-dialog').css('width', '800px');

                var prom = kb.ws.get_object_history({workspace: ws, name: id});
                $.when(prom).done(function(data) {
                    modal_body.rmLoading();
                    modal_body.append('<span class="h5"><b>Name</b></span>: '+id+'<br>')                            
                    modal_body.append('<span class="h5"><b>Database ID</b></span>: '+data[0][0]+'<br>')
                    var info = $('<table class="table table-striped table-bordered table-condensed">');
                    var header = $('<tr class="table-header"><th>Mod Date</th>\
                                        <th>Vers</th>\
                                        <th>Type</th>\
                                        <th>Owner</th>\
                                        <th>Checksum</th></tr>');
                    info.append(header);
                    for (var i=data.length-1; i >= 0; i--) {
                        var ver = data[i];
                        var row = getRow(ver);
                        info.append(row);
                    }

                    revert_btn = $('<a class="btn btn-primary btn-revert-object" disabled>Revert</a>')

                    modal_body.append(info);
                    info.find('tbody tr').not('.table-header').click( function(e) {
                        e.stopPropagation();                        
                        info.find('tbody tr').removeClass('selected');
                        $(this).addClass('selected');
                        revert_btn.removeAttr('disabled');
                    })
                    /* fixme: need modal api for this.  too much code */
                    var modal_content = historyModal.data('dialogModal').find('.modal-content');
                    modal_content.click(function(e) {
                        info.find('tbody tr').removeClass('selected');
                        revert_btn.attr('disabled', '')
                    })

                    revert_btn.click(function() {
                        var ver = info.find('.selected').data('ver');

                        historyModal.addCover().getCover().loading();
                        var p = kb.ws.revert_object({workspace: ws, name: id, ver: ver})
                        $.when(p).done(function(data) {
                            var row = getRow(data);
                            // insert new version
                            info.find('.table-header').after(row);
                            historyModal.addCover('Reverted to version '+ver);
                            historyModal.getCover().delay(2000).fadeOut(500);
                        }).fail(function(e) {
                            historyModal.addCover(e.error.message, 'danger');
                        })
                    })

                    modal_body.append(revert_btn)
                }).fail(function(e){
                    modal_body.append('<div class="alert alert-danger">'+
                            e.error.message+'</div>');
                });

                function getRow(ver) { 
                    var row = $('<tr data-ver="'+ver[4]+'">');                    
                    row.append('<td>' + ver[3].split('+')[0].replace('T',' ') + '</td>'
                               + '<td>' + ver[4] + '</td>'
                               + '<td>' + ver[2] + '</td>'
                               + '<td>' + ver[5] + '</td>'
                               + '<td>' + ver[8] + '</td>');
                    return row;
                }
            }

            function showObjectInfo(ws, id) {
                var info_modal = $('<div></div>').kbasePrompt({
                        title : id,
                        modalClass : '', 
                        controls : ['closeButton']
                    })

                info_modal.openPrompt();
                info_modal.data('dialogModal').find('.modal-dialog').css('width', '500px');
                var modal_body = info_modal.data('dialogModal').find('.modal-body');

                var params = [{workspace: ws, name: id}]
                var prom = kb.ws.get_object_info(params, 1);
                modal_body.loading();
                $.when(prom).done(function(data) {
                    modal_body.rmLoading();
                    var data = data[0];  // only 1 object was requested

                    modal_body.append('<h4>User Meta Data</h4>');
                    var usermeta = data[10];
                    if ($.isEmptyObject(usermeta)) {
                        modal_body.append('none');
                    } else {
                        var container = $('<div class="scroll-pane overflow-x">');
                        var table = $('<table class="table table-striped table-bordered table-condensed">');
                        var keys = [];
                        for (var key in usermeta) {
                            table.append('<tr><td><b>'+key+'</b></td><td>'+ usermeta[key]+'</td></tr>')
                        }
                        container.append(table)
                        modal_body.append(container);
                    }

                    // add properties table
                    var labels = ['ID', 'Name', 'Type', 'Moddate', 'Instance','Owner',
                                    'Workspace ID', 'Workspace', 'Checksum']
                    modal_body.append('<h4>Object Info</h4>');
                    var table = kb.ui.listTable('#obj-info-table', data, labels, 'bold')
                    table.append('<tr><td><b>Size</b></td><td>'+data[9]+
                                ' Bytes ('+readableSize(data[9])+')</td></tr>');
                    modal_body.append(table);                        

                    var download = $('<a class="btn btn-default pull-left">Download\
                                <span class="glyphicon glyphicon-download-alt"></span></a>')

                    download.click(function() {
                        var saveData = (function () {
                            var a = document.createElement("a");
                            document.body.appendChild(a);
                            a.style = "display: none";
                            return function (data, fileName) {
                                var json = JSON.stringify(data),
                                    blob = new Blob([json], {type: "octet/stream"}),
                                    url = window.URL.createObjectURL(blob);
                                a.href = url;
                                a.download = fileName;
                                a.click();
                                window.URL.revokeObjectURL(url);
                            };
                        }());

                        var prom = kb.ws.get_objects([{workspace: ws, name:id}])
                        $.when(prom).done(function(json) {
                            var fileName = id+'.'+data[4]+'.json';
                            saveData(json[0], fileName);
                        })

                    })
                    info_modal.data('dialogModal').find('.modal-footer .text-left').append(download);

                    var open = $('<a class="open-obj pull-left">View JSON</a>')
                    open.click(function() {
                        var fileName = id+'.'+data[4]+'.json';
                        var jsonWindow = window.open(fileName,"_blank");
                        jsonWindow.document.write('loading...  This may take several seconds or minutes.');
                        var prom = kb.ws.get_objects([{workspace: ws, name:id}])
                        $.when(prom).done(function(json) {
                            jsonWindow.document.body.innerHTML = ''
                            jsonWindow.document.write(JSON.stringify(json[0]));
                        })
                    })
                    info_modal.data('dialogModal').find('.modal-footer .text-left').append(open);
                }).fail(function(e){
                    modal_body.append('<div class="alert alert-danger">'+
                        e.error.message+'</div>');
                });
            }

            var trashbin;
            function displayTrashBin() {
                var tableSettings = {
                    "sPaginationType": "bootstrap",
                    //"sPaginationType": "full_numbers",
                    "iDisplayLength": 10,
                    "aaData": [],
                    //"fnDrawCallback": events,
                    "aaSorting": [[ 3, "desc" ]],
                  "aoColumns": [
                      { "sTitle": "", bSortable: false},
                      { "sTitle": "Name"}, //"sWidth": "10%"
                      { "sTitle": "Type", "sWidth": "20%"},
                      { "sTitle": "Last Modified", "iDataSort": 5},
                      { "sTitle": "Owner"},
                      { "sTitle": "Time Stamp", "bVisible": false, "sType": 'numeric'}                   

                  ],                         
                    "oLanguage": {
                        "sEmptyTable": "No objects in workspace",
                        "sSearch": "Search: "
                    }
                }

                // hide the objecttable, add back button{}
                var table_id = 'obj-table-'+ws.replace(':','_');
                $('#'+table_id+'_wrapper').hide();
                $(element).prepend('<h4 class="trash-header"><a class="btn btn-primary">\
                    <span class="glyphicon glyphicon-circle-arrow-left"></span> Back</a> '+ws+' \
                    <span class="text-danger">Trash Bin</span> <small><span class="text-muted">(Undelete option coming soon)</span></small></h4>');

                // event for back to workspace button
                $('.trash-header .btn').unbind('click');
                $('.trash-header .btn').click(function() {
                    if (typeof trashbin) { // fixme: cleanup
                        trashbin.fnDestroy();
                        $('#'+table_id+'-trash').remove();
                        trashbin = undefined;
                    }

                    $('.trash-header').remove();
                    $('#'+table_id+'_wrapper').show();
                })

                // if trash table hasn't already been rendered, render it
                if (typeof trashbin == 'undefined') {
                    $(element).append('<table id="'+table_id+'-trash" \
                        class="table table-bordered table-striped" style="width: 100%;"></table>');

                    var tableobjs = formatObjs(scope.deleted_objs, scope.obj_mapping) //,fav);
                    var wsobjs = tableobjs[0];
                    var kind_counts = tableobjs[1];

                    tableSettings.aaData = wsobjs;

                    // load object table
                    trashbin = $('#'+table_id+'-trash').dataTable(tableSettings);

                    if (scope.deleted_objs.length) {
                        var type_filter = getTypeFilterBtn(trashbin, kind_counts, scope.type)
                        $('.table-options').append(type_filter);
                    }

                    //searchColumns()
                    addOptionButtons();

                    // resinstantiate all events.
                    events();                     
                } else {
                    $('#'+table_id+'-trash_wrapper').show();
                }
            }


            function deleteObjects() {
                var params = {};
                var obj_ids = [];
                for (var i in scope.checkedList) {
                    var obj = {};
                    obj.workspace = scope.checkedList[i].ws;
                    obj.name = scope.checkedList[i].id;
                    obj_ids.push(obj);
                }

                var prom = kb.ws.delete_objects(obj_ids);
                $.when(prom).done(function(data) {
                    scope.loadObjTable();
                    //kb.ui.notify('Moved '+obj_ids.length+'objects to trashbin')
                })
                return prom;
            }

            function addToMV() {
                $('.fav-loading').loading()
                var count = scope.checkedList.length
                var p = favoriteService.addFavs(scope.checkedList);
                $.when(p).done(function() {
                    scope.updateFavs();
                })

                // add stars to table
                for (var i in scope.checkedList) {
                    var id = scope.checkedList[i].id;
                    var ws = scope.checkedList[i].ws;
                    var type = scope.checkedList[i].type;

                    $('.obj-id').each(function() {
                        if ($(this).data('ws')== ws 
                            && $(this).data('id') == id 
                            && $(this).data('type') == type
                            && !$(this).parent().find('.btn-fav').length) {
                            $(this).parent().append(' <span class="glyphicon glyphicon-star btn-fav"></span>');
                        }
                    })
                }

                // uncheck everything that is checked in that table ( this var is watched )
                scope.checkedList = [];
                scope.$apply()

                events()
            }

            // event for rename object button
            function renameObject() {
                var links = $('.ncheck-checked').eq(0).parents('tr').find('td').eq(1);
                var obj_id = links.find('.obj-id');
                var proj = obj_id.data('ws');
                var nar = obj_id.data('id');
                var version = $('.ncheck-checked').eq(0).parents('tr').find('.show-versions');
                var more = $('.ncheck-checked').eq(0).parents('tr').find('.btn-show-info');

                // add editable input to table
                var input = $('<input type="text" class="form-control">');
                var form = $('<div class="col-sm-4 input-group input-group-sm"></div>');
                form.append(input);
                input.val(nar);
                obj_id.parents('td').html(input);                            
                
                input.keypress(function (e) {
                    if (e.which == 13) {
                        $(this).blur();
                    }
                })

                // save new name when focus is lost or when key entered
                input.focusout(function() {
                    var new_name = $(this).val();

                    // if new name is actually new
                    if (new_name != nar) {
                        var notice = $('<span>saving...</span>');
                        input.parents('td').html(notice);

                        var p = kb.ws.rename_object({obj: {workspace: proj, name: nar}, new_name: new_name})
                        $.when(p).done(function(data) {
                            //change link on page
                            obj_id.data('id', new_name)
                            obj_id.text(new_name);
                            links.html('')
                            links.append(obj_id, ' (', version, ')', more);
                            notice.parents('td').html(links);
                            events();
                            //new FixedHeader( table , {offsetTop: 50, "zTop": 1000}); // no fixed header yet
                        }).fail(function(e){
                            notice.parents('td').html(links);
                            links.append(' <span class="text-danger">'+e.error.message+'</span>');
                            links.find('span').delay(3000).fadeOut(400, function(){
                                //$(this).remove();
                                links.html('')
                                links.append(obj_id, ' (', version, ')', more);
                                events();
                            });
                        })
                    } else {  // if didn't change name, replace link;
                        links.html('')
                        links.append(obj_id, ' (', version, ')', more);
                        events();
                    }
                });

                $('.nar-selected .nar-link').parent().html(form);
                input.focus();
            }

            function copyObjects(){
                var workspace = ws; // just getting current workspace

                var wsSelect = $('<form class="form-horizontal" role="form">\
                                    <div class="form-group">\
                                      <label class="col-sm-5 control-label">Destination Workspace</label>\
                                    </div>\
                                 </div>');

                var select = $('<select class="form-control select-ws"></select>')
                for (var key in scope.workspace_dict) {
                    select.append('<option>'+key+'</option>')
                }
                select = $('<div class="col-sm-5">').append(select);
                wsSelect.find('.form-group').append(select);

                var copyObjectsModal = $('<div></div>').kbasePrompt({
                        title : 'Copy Objects',
                        body: wsSelect,
                        modalClass : '', 
                        controls : ['cancelButton',
                            {name : 'Copy',
                            type : 'primary',
                            callback : function(e, $prompt) {
                                var ws = $('.select-ws option:selected').val()
                                confirmCopy(ws, $prompt);
                            }
                        }]
                    }
                );

                copyObjectsModal.openPrompt();
            }


            function copyObjectsToNarrative() {
                confirmCopy(USER_ID+':home');
            }


            function confirmCopy(new_ws, $copyprompt) {
                var alert = '<div class="alert alert-danger"><strong>Warning</strong> Are you sure you want to copy these <b>'
                        +scope.checkedList.length+'</b> objects to <i>'+new_ws+'</i>?';

                var confirmCopy = $('<div></div>').kbasePrompt({
                        title : 'Confirm',
                        body: alert,
                        modalClass : '',
                        controls : [{
                            name: 'No',
                            type: 'default',
                            callback: function(e, $prompt) {
                                $prompt.closePrompt();
                                }
                            },
                            {name : 'Yes',
                            type : 'primary',
                            callback : function(e, $prompt) {
                                var proms = [];
                                for (var i in scope.checkedList) {
                                    var obj_name = scope.checkedList[i].id;
                                    var params = {from: {workspace: ws, name: obj_name},
                                                  to: {workspace: new_ws, name: obj_name}}

                                    var prom = kb.ws.copy_object(params);
                                    proms.push(prom);
                                }

                                $.when.apply($, proms).done(function() {
                                    scope.loadWSTable();
                                    kb.ui.notify('Copied objects to: <i>'+new_ws+'</i>');
                                    $copyprompt.closePrompt();
                                    $prompt.closePrompt();
                                    //var btn = $('<button type="button" class="btn btn-primary">Close</button>');
                                    //btn.click(function() { $prompt.closePrompt(); })
                                    //$prompt.data('dialogModal').find('.modal-footer').html(btn);
                                }).fail(function(e) {
                                    $prompt.addCover('Could not copy some or all of the objects. '
                                                        +e.error.message, 'danger');
                                })
                            }
                        }]
                    }
                );
                confirmCopy.openPrompt();
            } 
        }

    };
})


.directive('wsmanage', function($location, $compile, $state, $stateParams) {
    return {
        link: function(scope, ele, attrs) {
            $(ele).append('<div class="h3 pull-left" style="margin-right: 30px;">Workspace Inspector</div>')
            var tableSettings = {

                    //"sPaginationType": "full_numbers",
                    "aaData": [],
                    //"fnDrawCallback": events,
                    "aaSorting": [[ 2, "desc" ]],
                    "iDisplayLength": 1000,                    
                    "aoColumns": [
                      { "sTitle": "Workspace"},
                      { "sTitle": "Owner"}, //"sWidth": "10%"
                      { "sTitle": "Last Modified", "iDataSort": 4},
                      { "sTitle": "Count"},
                      { "sTitle": "Time Stamp", "bVisible": false, "sType": 'numeric'}                   

                    ],     
                    "sDom": "R<'row'<'col-xs-12 table-options'i>r>t<'row'<'col-xs-12'>>",
                    "oLanguage": {
                        "sEmptyTable": "No workspaces found",
                        "sSearch": "Search: ",
                        "sInfo": '_TOTAL_ workspaces, excluding "kbasesearch"',
                        "sInfoFiltered": ""
                    }
                }



            $(ele).loading();
            var prom = kb.ws.list_workspace_info({});
            $.when(prom).done(function(data) {
                $(ele).rmLoading()

                var rows = [];
                var total_count = 0;
                for (var i in data) {

                    var row = data[i];
                    var owner = row[2]      
                    
                    if (owner == 'kbasesearch') continue;

                    var timestamp = kb.ui.getTimestamp(data[i][3].split('+')[0]);
                    var date = kb.ui.formateDate(timestamp);

                    var ws = row[1];
                    var count = row[4]
                    total_count = total_count+count;

                    var url = "ws.id({ws:'"+ws+"'})";
                    var link = '<a ui-sref="'+url+'" >'+ws+'</a>';
                    rows.push([link, owner, date, count, timestamp])
                }
                tableSettings.aaData = rows;

                var container = $('<table id="ws-manage" class="table table-bordered" style="width: 100%;"></table>');


                $(ele).append(container)
                var table = $(container).dataTable(tableSettings)
                $compile(table)(scope);

                $('.table-options').append('<span class="badge badge-primary pull-right">'
                                                +total_count+' Objects'+
                                           '</span>')

                $('#ws-manage thead th').each( function () {
                    var title = $('#ws-manage thead th').eq( $(this).index() ).text();
                    $(this).append(' <div><input type="text" class="select-filter" placeholder="Search '+title+'" ></input></div>' );
                } );
    /*
     * Support functions to provide a little bit of 'user friendlyness' to the textboxes
     */
                $("thead input").click(function(e) {
                    e.stopPropagation()
                    e.preventDefault()
                    $(this).focus()
                })

                $("input").keyup( function () {
                    /* Filter on the column (the index) of this element */
                    table.fnFilter( this.value, table.oApi._fnVisibleToColumnIndex( 
                        table.fnSettings(), $("thead input").index(this) ), true );
                } );
                        
            })
                         
        }           




    }
})



function getEditableDescription(d) {
    var d = $('<form role="form">\
               <div class="form-group">\
                <textarea rows="4" class="form-control" placeholder="Description">'+d+'</textarea>\
              </div>\
              </form>');
    return d;
}

function parse_name(name) {
    if (name.indexOf(USER_ID+':') != -1) {
        return name.split(':')[1];
    } else {
        return name;
    }
}
function save_dt_view (oSettings, oData) {
  localStorage.setItem( 'DataTables_'+window.location.pathname, JSON.stringify(oData) );
}
function load_dt_view (oSettings) {
  return JSON.parse( localStorage.getItem('DataTables_'+window.location.pathname) );
}
function reset_dt_view() {
  localStorage.removeItem('DataTables_'+window.location.pathname);
}

function searchColumns() {
    /* Add the events etc before DataTables hides a column */
    $("thead input").keyup( function () {
        /* Filter on the column (the index) of this element */
        oTable.fnFilter( this.value, oTable.oApi._fnVisibleToColumnIndex( 
            oTable.fnSettings(), $("thead input").index(this) ) );
    } );
    
    /*
     * Support functions to provide a little bit of 'user friendlyness' to the textboxes
     */
    $("thead input").each( function (i) {
        this.initVal = this.value;
    } );
    
    $("thead input").focus( function () {
        if ( this.className == "search_init" )
        {
            this.className = "";
            this.value = "";
        }
    } );
    
    $("thead input").blur( function (i) {
        if ( this.value == "" )
        {
            this.className = "search_init";
            this.value = this.initVal;
        }
    } );
}

function getCols(table, title) {
    var cols = table.fnSettings().aoColumns;

    if (title) {
        var col_num;

        for (var i in cols) {
            if (cols[i].sTitle == title) {
                col_num = i;
                break;
            }
        }
        return col_num
    }

    return cols;
}

// interesting solution from http://stackoverflow.com/questions
// /15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript 
function readableSize(bytes) {
   var units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
   if (bytes == 0) return '0 Bytes';
   var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
   return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + units[i];
};


