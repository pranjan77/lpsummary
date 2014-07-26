/*
 * TODO:
 *  (done) - Janaka suggestion: type select box
 *  (done) - object selection via checkbox in table
 *  (done) - when only one workspace is selected, try hiding workspace column
 *  (done) - show object history
 *  (mostly done) - object functions (delete, move, copy, etc)
 *
 *  (pending) - any way to check for require timeouts? 
 *  (pending) - concept and implementation of trashbin
 *  (pedding) - don't allow user to check boxes of different workspaces
 *  (pending) - test browser compatibility
 *  (pending) - login 'forget password' and 'register', swap widgets
 *
 *  (?) - should workspace be selected when creating/cloning? 
 *  (?) - async workspace clone, delete, and object download
 *  (?) - currently selected workspace, and option to change
 *  (reject?) - save table state: records per page, search box, sort columns, and page
 */

require(['jquery', 'kbase/Auth', 'kbase/util', 'kbase/kbaseWSHandler', 'kbase/jquery.cookie.min', 
    'kbase/kbaseWidget', 'kbase/kbaseLogin',
    'lib/jquery.dataTables', 'lib/bootstrap', 'workspaceService', 'fbaModelServices', 'kbase/kbaseWSSelector',
    'kbase/kbaseModelView', 'kbase/jquery.kbase.fba-view'],
function(    $,        Auth,           util ) {
    var self = this;

    // GLOBAL (to this script)
    $('#signin-button').kbaseLogin({style: 'text', 
                login_callback: login_cb, logout_callback: logout_cb});
    var userToken = $("#signin-button").kbaseLogin('session').token;

    var workspaces, wsSelector, objectTable, state;
    var modelView, fbaView;

    // list of currently checked objects
    var checkedList = [];

    // State object stores selected workspaces and filtered options
    state = new State();

    // check if logged in, add appropriate link (make sure document is ready)
    //$(function() {
    //    checkLoggedIn();        
    //});

    // extend defaults for datatables and other things
    extendDefaults();

	// two main objects, the workspace selector (left column) and the object table (middle column)
    objectTable = new ObjectTable();
    wsSelector = $('#ws-container').kbaseWSSelector({userToken: userToken,
                                                               selectHandler: selectHandler});
    console.log(wsSelector)

    $('#main-right-content').append(objectTable.getHtml());

    var first = true;
    var prevPromises = []; // store previous promises to cancel
    function selectHandler(selected) {
        workspaces = wsSelector.workspaces;

    	// tell the previous promise(s) not to fire
        prevPromises.cancel = true;

        // workspaces might have data loaded already
        var promises = [];
        prevPromises = promises;

    	// loop through selected workspaces and download objects if they haven't been downloaded yet
        for (var i=0; i<selected.length; i++) {
            var workspace = selected[i];

            var objType = $.type(workspace.objectData);
            if (objType === 'undefined') {
                // no data and not being downloaded
                var p = workspace.getAllObjectsMeta();
                workspace.objectData = p; // save the promise
                promises.push(p);

        		// provide closure over workspace
                (function(workspace) {
                    p.done(function(data) {
        			// save the data and tell workspace selector that the workspace has it's data
                        workspace.objectData = data;
                        wsSelector.setLoaded(workspace);
                    });
                })(workspace);
            } else if (objType === 'object') {
                // data being downloaded (objectData is a promise)
                promises.push(workspace.objectData);
            }
        }

        if (promises.length > 0) {
    	    // may take some time to load
            objectTable.loading(true);
        }

    	// when all the promises are done...
        $.when.apply($, promises).done(function() {
            if (promises.cancel) {
        		// do nothing if it was cancelled
                return;
            }

    	    // reload the object table
            objectTable.reload(selected).done(function() {
                if (promises.cancel) {
                    return;
                }

                if (first) {
                    firstSelect();
                    first = false;
                }
            });
        });

        // this function is called upon the first selection event
        //  it sets absolute position for the data table so that it scrolls nicely
        function firstSelect() {
            objectTable.fixColumnSize();

            // move table element into new scrollable div with absolute position
            var otable = $('#object-table');
            var parts = otable.children().children();
                    
            var header = parts.eq(0);
            var table = parts.eq(1);
            var footer = parts.eq(2);

            header.css({
                position: 'absolute',
                top: '0px',
                left: '0px',
                right: '0px'
            });

            table.css({
                position: 'absolute',
                top: (header.height() + 2) + 'px',
                left: '0px',
                right: '0px',
                bottom: (footer.height() + 2) + 'px'
            });

            table.find('.dataTables_scrollBody').css({
                position: 'absolute',
                height: '',
                width: '',
                top: table.find('.dataTables_scrollHead').height(),
                left: '0px',
                right: '0px',
                bottom: '0px'
            });

            footer.css({
                position: 'absolute',
                bottom: '0px',
                left: '0px',
                right: '0px'
            });
        }
    }

    function get_user_token() {
        var token = $(".signin-button").kbaseLogin('session').token;
        return token;
    }    
    /*
    function checkLoggedIn() {
        if (auth.isLoggedIn()) {
            // create logout link
            var logoutLink = $('<button class="btn btn-link"'
                               + ' style="padding: 0px 4px; margin-top: 0px;">Sign Out</button>');
            logoutLink.click(logout);

            $('#header-login')
                .append('<div style="margin-bottom: -3px;">' + auth.getUserData().user_id + '</div>')
                .append(logoutLink);
        } else {
            // create login link
            var loginLink = $('<button class="btn btn-link"'
                              + 'style="padding: 0px 4px; margin-top: 7px;">Sign In</button>');
            loginLink.click(login);

            $('#header-login').append(loginLink);
        }
    }*/

    function login_cb() {
        window.location.reload();
    }

    function logout_cb() {
        window.location.reload();
    }

    function copyObjects(checkedList) {
        var workspace = checkedList[0][2]; // Fixme: just getting first workspace in list

        var modal = new Modal();

        modal.setTitle('Copy '+checkedList.length+' Object(s)');
        modal.setContent(
            '<div><h4 style="margin-top: 0px;"></h4>'
                + '<table style="margin-left: auto; margin-right: auto; text-align: right; width: 300px;">'
                + '<tr><td>Workspace:</td>'
                + '<td id="clone-into-cell"></td></tr>'
                //+ '<tr id="clone-permission-row"><td>Global Permission:</td>'
                + '</tr></table></div>'
        );

        $('#clone-permission').css({
            width: '164px'
        });
        
        //var isNew = true,
        var cell = $('#clone-into-cell'),
            newInput = $('<input type="text" id="clone-id" style="width: 150px" />'),
            existingInput = $('<select class="hide" style="width: 164px">'),
            permRow = $('#clone-permission-row');
         
        cell.append(newInput).append(existingInput);

        // setup event for switching between 'new' and 'existing'
        // adding class 'hide' to newInput doesn't work, bug in bootstrap
        isNew = false;
        newInput.hide();
        permRow.hide();
        existingInput.show();

        newInput.keypress(function(e) {
            if (e.which == 13) {
                modal.submit();
            }
        });

        // add options for workspaces with 'write' permission
        for (var i=0; i<workspaces.length; i++) {
            var ws = workspaces[i];
            if (ws === workspace) {
                continue;
            }

            if (ws.user_permission === 'a' ||
                ws.user_permission === 'w') {
                existingInput.append('<option value="' + ws.id + '">' + ws.id + '</option>');
            }
        }


        // show manage modal when modal is hidden
        /*
        modal.on('hidden', function() {
            manageModal.on('hidden', function() {
                manageModal.delete();
            });

            modal.delete();
            manageModal.show();
        });

        manageModal.off('hidden');
        manageModal.hide();
        */

        modal.setButtons('Cancel', 'Copy');
        modal.on('submit', function() {
            for (var i in checkedList) {
                var item = checkedList[i];
                var id = item[0], 
                    ws = item[2],
                    type = item[3];
                var workspace = getWorkspaceFromId(ws);

                var workspaceId,
                    perm;

                workspaceId = existingInput.find('option').filter(':selected').val();

                modal.alertHide();
                modal.lock();
                modal.cover('<img src="../common/img/loading.gif" /><br />This may take a while...');

                var promises = [];
                var p = workspace.copyObject(type, id, workspaceId, id);
                promises.push(p);

            } //end for loop

            $.when.apply($, promises).done(function(newWorkspace) {
                // get the object metadata
                newWorkspace.getAllObjectsMeta().done(function(objects) {
                    newWorkspace.objectData = objects;
                    modal.coverAlert('<strong>Success</strong><br />' + "Done copying objects.", 'success');

                    modal.off('hidden');
                    modal.on('hidden', function() {
                        // find existing workspace
                        var existWorkspace;
                        for (var i=0; i<workspaces.length; i++) {
                            var workspace = workspaces[i];
                            if (workspace.id === workspaceId) {
                                existWorkspace = workspace;
                                break;
                            }
                        }
                        //workspaces.replace(existWorkspace, newWorkspace);
                        //manageModal.delete();
                        modal.delete();
                        window.location.reload()                         
                    });

                    finish();
                }).fail(function(error) {
                    modal.coverAlert('<strong>Error</strong><br />' + "Could not get workspace '" + workspace.id + "'", 'error');
                    finish();
                });
            }).fail(function() {
                modal.coverAlert('<strong>Error</strong><br />' + "Could not clone workspace '" + workspace.id + "'", 'error');
                finish();
            });
        });

        modal.show();

        function finish() {
            // change buttons
            modal.setButtons(null, 'Close');
            modal.off('submit');
            modal.on('submit', function() {
                modal.hide();
            });

            modal.unlock();
        }
    }

    function moveObjects(checkedList) {
        var workspace = checkedList[0][2]; // just getting current workspace

        var modal = new Modal();

        modal.setTitle('Move '+checkedList.length+' Object(s)');
        modal.setContent(
            '<div><h4 style="margin-top: 0px;"></h4>'
                + '<table style="margin-left: auto; margin-right: auto; text-align: right; width: 300px;">'
                + '<tr><td>Workspace:</td>'
                + '<td id="clone-into-cell"></td></tr>'
                //+ '<tr id="clone-permission-row"><td>Global Permission:</td>'
                + '</tr></table></div>'
        );

        $('#clone-permission').css({
            width: '164px'
        });
        
        //var isNew = true,
        var cell = $('#clone-into-cell'),
            newInput = $('<input type="text" id="clone-id" style="width: 150px" />'),
            existingInput = $('<select class="hide" style="width: 164px">'),
            permRow = $('#clone-permission-row');
         
        cell.append(newInput).append(existingInput);

        // setup event for switching between 'new' and 'existing'
        // adding class 'hide' to newInput doesn't work, bug in bootstrap
        isNew = false;
        newInput.hide();
        permRow.hide();
        existingInput.show();

        newInput.keypress(function(e) {
            if (e.which == 13) {
                modal.submit();
            }
        });

        // add options for workspaces with 'write' permission
        for (var i=0; i<workspaces.length; i++) {
            var ws = workspaces[i];
            if (ws === workspace) {
                continue;
            }

            if (ws.user_permission === 'a' ||
                ws.user_permission === 'w') {
                existingInput.append('<option value="' + ws.id + '">' + ws.id + '</option>');
            }
        }

        modal.setButtons('Cancel', 'Move');
        modal.on('submit', function() {
            for (var i in checkedList) {
                var item = checkedList[i];
                var id = item[0], 
                    ws = item[2],
                    type = item[3];
                var workspace = getWorkspaceFromId(ws);

                var workspaceId,
                    perm;

                workspaceId = existingInput.find('option').filter(':selected').val();

                modal.alertHide();
                modal.lock();
                modal.cover('<img src="img/loading.gif" /><br />This may take a while...');

                var promises = [];
                var p = workspace.moveObject(type, id, workspaceId, id);
                promises.push(p);

            } //end for loop


            $.when.apply($, promises).done(function(newWorkspace) {
                // get the object metadata
                newWorkspace.getAllObjectsMeta().done(function(objects) {
                    newWorkspace.objectData = objects;
                    modal.coverAlert('<strong>Success</strong><br />' + "Moved objects into '" + newWorkspace.id + "'", 'success');

                    modal.off('hidden');
                    modal.on('hidden', function() {
                        // find existing workspace
                        var existWorkspace;
                        for (var i=0; i<workspaces.length; i++) {
                            var workspace = workspaces[i];
                            if (workspace.id === workspaceId) {
                                existWorkspace = workspace;
                                break;
                            }
                        }
                        //workspaces.replace(existWorkspace, newWorkspace);
                        //manageModal.delete();
                        modal.delete();
                        window.location.reload()                        
                    });

                    finish();
                }).fail(function(error) {
                    modal.coverAlert('<strong>Error</strong><br />' + "Could not get workspace '" + workspace.id + "'", 'error');
                    finish();
                });
            }).fail(function() {
                modal.coverAlert('<strong>Error</strong><br />' + "Could not clone workspace '" + workspace.id + "'", 'error');
                finish();
            });
        });

        modal.show();

        function finish() {
            // change buttons
            modal.setButtons(null, 'Close');
            modal.off('submit');
            modal.on('submit', function() {
                modal.hide();
            });

            modal.unlock();
        }
    }

    // show the delete workspace modal, pretty straight forward
    function deleteWorkspace(workspace, manageModal) {
        var modal = new Modal();

        modal.setTitle('Delete Workspace');
        modal.setContent(
            '<span>Are you sure you want to delete this workspace?'
                + '<h3>' + workspace.id + '</h3>'
                + 'This action is irreversible.</span>'
        );

        modal.alert('<strong>Warning</strong><br />All objects in the workspace will be deleted!', 'warning');

        modal.on('hidden', function() {
            manageModal.on('hidden', function() {
                manageModal.delete();
            });

            modal.delete();
            manageModal.show();
        });

        manageModal.off('hidden');
        manageModal.hide();

        modal.setButtons('No', 'Yes');

        modal.on('submit', function() {
            modal.alertHide();
            modal.lock();
            modal.cover('<img src="img/loading.gif" /><br />This may take a while...');

            workspace.delete().done(function() {
                modal.coverAlert('<strong>Success</strong><br />' + "Deleted workspace '" + workspace.id + "'", 'success');

                modal.off('hidden');
                modal.on('hidden', function() {
                    // remove from workspaces
                    workspaces.remove(workspace);
                    manageModal.delete();
                    modal.delete();
                });
            }).fail(function() {
                modal.coverAlert('<strong>Error</strong><br />' + "Could not delete workspace '" + workspace.id + "'", 'error');
            }).always(function() {
                // change buttons
                modal.setButtons(null, 'Close');
                modal.off('submit');
                modal.on('submit', function() {
                    modal.hide();
                });

                modal.unlock();
            });
        });

        modal.show();
    }

    // show the delete workspace modal, pretty straight forward
    function deleteObjects(checkList) {
        var modal = new Modal();

        modal.setTitle('Delete '+checkList.length+' object(s)?');
        modal.setContent(
            '<span>Are you sure you want to delete these '+checkList.length+' object(s)?<br>'
                + 'This action is irreversible.</span>'
        );

        modal.alert('<strong>Warning</strong><br />All selected objects in this workspace will be deleted!', 'warning');
        modal.setButtons('No', 'Yes');

        modal.on('submit', function() {
            modal.alertHide();
            modal.lock();
            modal.cover('<img src="img/loading.gif" /><br />This may take a while...');

            del_objs = []
            for (var i in checkedList) {
                var ws_object = checkList[i]
                var id = ws_object[0], 
                    ws = ws_object[2],
                    type = ws_object[3];
                del_objs.push(id);
                var workspace = getWorkspaceFromId(ws);

                var promises = [];
                var p = workspace.deleteObj(type, id)
                promises.push(p);

            }

            $.when.apply($, promises).done(function(data) {
                modal.coverAlert('<strong>Success</strong><br />' + 
                    "Deleted "+checkedList.length+" objects", 'success');

                modal.off('hidden');
                modal.on('hidden', function() {
                    // remove from workspaces
                    //workspaces.remove(workspace);
                    //manageModal.delete();
                    /*
                    var sel = state.get('selected');
                    console.log('selected', sel)
                    sel_ws = []
                    for (var i in sel) {
                        sel_ws.push(getWorkspaceFromId(sel[i]))
                    }

                    objectTable.reload(sel_ws)
                    */
                    modal.delete();
                    window.location.reload()
                });
            }).fail(function() {
                modal.coverAlert('<strong>Error</strong><br />' + "Could not delete an object", 'error');
            }).always(function() {
                // change buttons
                modal.setButtons(null, 'Close');
                modal.off('submit');
                modal.on('submit', function() {
                    modal.hide();
                });

                modal.unlock();
            });


        });

        modal.show();
    }

    function createPermissionSelect(id, value, noNone) {
        var sel = ' selected="selected"';
        var idval = ' id="' + id + '"';

        return '<select' + (id ? idval : '') + ' class="input-small"'
            + ' style="margin: 0px;" data-value="' + value + '">'
            + (noNone ? '' : '<option value="n"' + (value === 'n' ? sel : '') + '>none</option>')
            + '<option value="r"' + (value === 'r' ? sel : '') + '>read</option>'
            + '<option value="w"' + (value === 'w' ? sel : '') + '>write</option>'
            + '<option value="a"' + (value === 'a' ? sel : '') + '>admin</option>'
            + '</select>';
    }

    function getWorkspaceFromId(id) {
        for (var i=0; i<workspaces.length; i++) {
            var workspace = workspaces[i];
            if (workspace.id === id) {
                return workspace;
            }
        }

        return null;
    }

    function getWorkspaceObjectFromId(workspace, type, id) {
        for (var i=0; i<workspace.objectData.length; i++) {
            var object = workspace.objectData[i];
            if (object.type === type && object.id === id) {
                return object;
            }
        }

        return null;
    }

    function viewObject(e) {
        $('#object-table-container').hide();
        var ids = [$(this).data('id')];
        var ws = [$(this).data('workspace')];
        var type = $(this).data('type')

        if (type == "Model") {
            $('#main-right-content').append('<button class="btn back-button" \
                style="float: left; margin: 0 5px 0 0;" >back</div>');

            modelView = $('#main-right-content').kbaseModelView({ids: ids,
                workspaces: ws});

            $('.back-button').unbind('click');
            $('.back-button').click(function(){
                clearViewObject();
                $('#object-table-container').show();
            })
        }
        if (type == "FBA") {
            $('#main-right-content').append('<button class="btn back-button" \
                style="float: left; margin: 0 5px 0 0;" >back</div>');

            fbaView = $('#main-right-content').fbaView({ids: ids,
                workspaces: ws});

            $('.back-button').unbind('click');
            $('.back-button').click(function(){
                clearViewObject();
                $('#object-table-container').show();
            })
        }

    }

    function clearViewObject() {        
        $('.back-button').remove();
        if (modelView) { 
            modelView.destroyView(); 
        }
        if (fbaView) { 
            fbaView.destroyView(); 
        }

    }


    function initOptButtons() {
            // select all objects button
            $('.select-objs').remove()
            $('.obj-opts').append('<a class="btn dropdown-toggle select-objs"><div class="ncheck-btn"></div></a>');
            //<div class="ncheck-btn"></div>
            // filter types button
            $('.type-filter').remove()
            $('.obj-opts').append('<select class="input-small type-filter"> \
                                          <option selected="selected">All Types</option> \
                                          <option>Genome</option> \
                                          <option>FBA</option> \
                                          <option>Model</option> \
                                          <option>PhenotypeSet</option> \
                                          <option>Media</option> \
                                    </select>');

            // select all events
            $('.select-objs .ncheck-btn').unbind('click')
            $('.select-objs .ncheck-btn').click(function(){
                // if already checked un check
                if ($(this).hasClass('ncheck-checked')) {
                    $('.check-option').removeClass('ncheck-checked');
                    $(this).removeClass('ncheck-checked');
                    $('.checked-opts').hide();
                    checkedList = []

                // if check box is already checked
                } else {
                    $('.checked-opts').show();
                    $('.check-option').addClass('ncheck-checked');
                    $(this).removeClass('ncheck-minus');
                    $(this).addClass('ncheck-checked');

                    checkedList = [];
                    $('.check-option').each(function(){
                        var id = $(this).attr('data-id');
                        var modelID = get_fba_model_id( $(this).attr('data-id') );            
                        var dataWS = $(this).attr('data-workspace');
                        var dataType = $(this).attr('data-type');
                        checkedList.push([id, modelID, dataWS, dataType])                         
                    })
                }
                checkBoxObjectClick();
            })

            // individual checkbox select events
            checkBoxObjectClick('.check-option');
//        }        
    }

    function checkBoxObjectClick(ele) {
        // if select all checkbox was clicked
        if (!ele) {
            resetOptionButtons();
            objOptClick()            
            return;
        }

        // checkbox click event
        $(ele).unbind('click');
        $(ele).click(function(){
            var id = $(this).attr('data-id');
            var modelID = get_fba_model_id( $(this).attr('data-id') );            
            var dataWS = $(this).attr('data-workspace');
            var dataType = $(this).attr('data-type');
            $('.select-objs .ncheck-btn').addClass('ncheck-minus');            

            if ($(this).hasClass('ncheck-checked')) { 
                $(this).removeClass('ncheck-checked');
                for (var i = 0; i < checkedList.length; i++) {
                    if (checkedList[i][0] == id) {
                        checkedList.splice(i,1);
                    }
                }
            } else {
                checkedList.push([id, modelID, dataWS, dataType]);
                $(this).addClass('ncheck-checked');
            }
            resetOptionButtons();
            objOptClick();
        })

        function resetOptionButtons() {
            /* if options dropdown doesn't exist, add it (at top of table) */
            if ($('.checked-opts').length == 0) {

                // container for options
                $('.obj-opts').append('<div class="checked-opts obj-opt"></div>')

                // delete button
                $('.checked-opts').append('<a class="btn obj-btn opt-delete btn-danger">\
                                           <i class="icon-trash icon-white"></i></a>')

                // move, copy, download button
                $('.checked-opts').append('<div class="dropdown obj-opt opt-dropdown"> \
                                    <a class="btn obj-btn dropdown-toggle" type="button" data-toggle="dropdown"> \
                                 <i class="icon-folder-open"></i> <span class="caret"></span></a>\
                                 <ul class="dropdown-menu"> \
                                  <li opt="copy"><a>Copy</a> </li> \
                                  <li  opt="move"><a>Move</a></li> \
                                  <li class="divider"><a></a></li> \
                                  <li><a>Download</li> \
                            </ul></div>');
                                //<i class="icon-download-alt"></i></a>

                // model viewer button
                if ($(this).attr('data-type') == "FBA") {
                    var url = 'http://mcs.anl.gov/~nconrad/model_viewer/#models?kbids='+id+'&ws='+dataWS+'&tab=core';
                    $('.checked-opts').append('<div class="btn obj-opt opt-delete" type="button" \
                        onclick="location.href='+"'" +url+"'"+'" >Model Viewer</div>');
                }
 
            // if no checkboxes are checked, remove buttons and checks
            } else if (checkedList.length == 0) { 
                $('.checked-opts').remove();
                $('.select-objs .ncheck-btn').removeClass('ncheck-minus');
            }
        }
    }

    function versionObjectClick(ele, table) {

        // tooltip for version hover
        $(ele).tooltip({html: true, title:'show history \
            <i class="icon-list-alt icon-white history-icon"></i>'
            , placement: 'right'});


        $(ele).unbind('click');
        $(ele).click(function() {
            var self = this;
            var id = $(this).attr('data-id'),
                ws = $(this).attr('data-workspace'),
                type = $(this).attr('data-type')
            var workspace = getWorkspaceFromId(ws);

            var tr = $(this).closest('tr')[0];
            if ( table.fnIsOpen( tr ) ) {
                table.fnClose( tr );
                $(self).attr('data-original-title', 'show history <i class="icon-list-alt icon-white history-icon"></i>')
                          .tooltip('fixTitle')

            } else {
                table.fnOpen( tr, '', "info_row" );
                var prom = workspace.getObjectHistory(type, id);

                $.when(prom).done(function(data) {
                    $(tr).next().children('td').append('<h5>History of <i>'+id+'</i></h5>');

                    var info = $('<table class="history-table">');
                    var header = $('<tr><th>ID</th>\
                                        <th>Type</th>\
                                        <th>WS</th>\
                                        <th>Vers</th>\
                                        <th>Owner</th>\
                                        <th>Last modby</th>\
                                        <th>Cmd</th>\
                                        <th>Moddate</th>');
                    info.append(header);
                    for (var i=0; i<data.length; i++) {
                        var ver = data[i];
                        var row = $('<tr>');
                        row.append('<td><a class="id-download" data-version="'+ver[3]+
                            '" data-id="'+id+'" data-type="'+type+
                            '" data-workspace="'+ws+'">' + ver[0] + '</a></td>'
                                 + '<td>' + ver[1] + '</td>'
                                 + '<td>' + ver[2] + '</td>'
                                 + '<td>' + ver[3] + '</td>'
                                 + '<td>' + ver[4] + '</td>'
                                 + '<td>' + ver[5] + '</td>'
                                 + '<td>' + ver[6] + '</td>'
                                 + '<td>' + ver[7] + '</td>');
                        info.append(row);
                    }
                    $(tr).next().children('td').append(info.html())

                    $(self).attr('data-original-title', 'hide history')
                              .tooltip('fixTitle');
                    //table.on('click', '.id-download', workspaceObjectVersionClick);
                })

            }
        });

    }

    // events for top row options on objects, after checked
    function objOptClick() {
        $('.opt-delete').unbind('click')
        $('.opt-delete').click(function(){
            deleteObjects(checkedList)
        });

        $('.opt-dropdown ul li').unbind('click')
        $('.opt-dropdown ul li').click(function(){
            if ($(this).attr('opt') == 'copy'){
                copyObjects(checkedList);
            } else if ($(this).attr('opt') == 'move'){
                moveObjects(checkedList);
            }
        })
    }
    
    // show preview of object data
    function workspaceObjectClick(e) {
        var workspace = getWorkspaceFromId(String($(this).data('workspace'))),
            type = String($(this).data('type')),
            object = getWorkspaceObjectFromId(workspace, type, String($(this).data('id')));

        // Genome, Model, Media, FBA, Annotation
        var hasHtml = (type.match(/^(Genome|Model|Media|FBA|Annotation)$/) !== null ? true : false);

        var modal = new Modal();

        modal.setTitle($(this).data('id'));

        modal.setButtons(null, 'Close');
        modal.on('submit', function() {
            modal.hide();
        });

        modal.on('hidden', function() {
            modal.delete();
            modal = null;
        });

        var container = $('<div>');

        var openURL = workspaceObjectLink(workspace, type, object, 'json');
        container.append('<a href="' + openURL + '" target="_blank">Open</a>');

        /*
        if (hasHtml) {
            var htmlURL = workspaceObjectLink(workspace, type, object, 'html');
            container.append('<a class="view-object" style="margin-left: 50px;">View HTML</a>');
        }
        */


        var meta = $('<table class="table table-bordered table-condensed">');
        container.append('<br />Metadata<br />', meta);

        if ($.isEmptyObject(object.metadata)) {
            meta.append('<tr><td><div style="text-align: center">No metadata</div></td></tr>');
        } else {
            $.each(object.metadata, function(key, value) {
                meta.append('<tr><td><strong>' + key + '</strong></td><td>' + value + '</td></tr>');
            });
        }

        container.append('<br />Properties');
        var prop = $('<table class="table table-bordered table-condensed">');
        container.append(prop);

        $.each(object, function(key, value) {
            if (key === 'metadata') {
                return;
            }

            prop.append('<tr><td><strong>' + key + '</strong></td><td>' + value + '</td></tr>');
        });

        modal.setContent(container);

        modal.show({ backdrop: true });
    }

    // show preview of object version data
    function workspaceObjectVersionClick(e) {
        var workspace = getWorkspaceFromId(String($(this).data('workspace'))),
            type = String($(this).data('type')),
            object = getWorkspaceObjectFromId(workspace, type, String($(this).data('id')));

        // Genome, Model, Media, FBA, Annotation
        var hasHtml = (type.match(/^(Genome|Model|Media|FBA|Annotation)$/) !== null ? true : false);

        var modal = new Modal();

        modal.setTitle($(this).data('id'));

        modal.setButtons(null, 'Close');
        modal.on('submit', function() {
            modal.hide();
        });

        modal.on('hidden', function() {
            modal.delete();
            modal = null;
        });

        var container = $('<div>');

        var openURL = workspaceObjectLink(workspace, type, object, 'json');
        container.append('<a href="' + openURL + '" target="_blank">Open</a>');

        if (hasHtml) {
            var htmlURL = workspaceObjectLink(workspace, type, object, 'html');
            container.append('<a href="' + htmlURL + '" target="_blank" style="margin-left: 50px;">View HTML</a>');
        }

        var meta = $('<table class="table table-bordered table-condensed">');
        container.append('<br />Metadata<br />', meta);

        if ($.isEmptyObject(object.metadata)) {
            meta.append('<tr><td><div style="text-align: center">No metadata</div></td></tr>');
        } else {
            $.each(object.metadata, function(key, value) {
                meta.append('<tr><td><strong>' + key + '</strong></td><td>' + value + '</td></tr>');
            });
        }

        container.append('<br />Properties');
        var prop = $('<table class="table table-bordered table-condensed">');
        container.append(prop);

        $.each(object, function(key, value) {
            if (key === 'metadata') {
                return;
            }

            prop.append('<tr><td><strong>' + key + '</strong></td><td>' + value + '</td></tr>');
        });

        modal.setContent(container);

        modal.show({ backdrop: true });
    }


    function workspaceObjectLink(workspace, type, object, action) {
        return '/objects'
            + '/' + encodeURIComponent(workspace.id)
            + '/' + encodeURIComponent(type)
            + '/' + encodeURIComponent(object.id)
            + '.' + action;
    }

    /*
     *  Function to store state in local storage.
     * 
     *  Better than storing list of selected workspaces
     *  in the URL (e.g. #workspace1&workspace2&workspace3...)
     * 
     *  Not optimized for large quantities of data
     */
    function State() {
        // Adapted from here: http://diveintohtml5.info/storage.html
        var ls;
        try {
            ls = 'localStorage' in window && window['localStorage'] !== null;
        } catch (e) {
            ls = false;
        }

        //var user = (auth.isLoggedIn() ? auth.getUserData().user_id : 'public');

        this.get = function(key) {
            if (!ls) {
                return null;
            }

            //key = user + '.' + key;

            var val = localStorage.getItem(key);

            try {
                val = JSON.parse(val);
            } catch(e) {
                return null;
            };

            return val;
        };

        this.set = function(key, val) {
            if (!ls) {
                return null;
            }

            //key = user + '.' + key;
            
            try {
                val = JSON.stringify(val);
            } catch(e) {
                return null;
            }

            return localStorage.setItem(key, val);
        };
    }



    function extendDefaults() {
        /*
         * jQuery.browser.mobile (http://detectmobilebrowser.com/)
         *
         * jQuery.browser.mobile will be true if the browser is a mobile device
         *
         * Modified to include tablets, via:
         *   http://www.jquery4u.com/mobile/detect-mobile-devices-jquery/
         * 
         **/
        (function(a){jQuery.browser.mobile=/android|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(ad|hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|symbian|tablet|treo|up\.(browser|link)|vodafone|wap|webos|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|e\-|e\/|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(di|rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|xda(\-|2|g)|yas\-|your|zeto|zte\-/i.test(a.substr(0,4));})(navigator.userAgent||navigator.vendor||window.opera);

        // should also look into Modernizr and the Touch event

        /*
         *  Modifications to get DataTables working with Bootstrap
         *    Taken from here: http://datatables.net/blog/Twitter_Bootstrap_2
         */

        /* Set the defaults for DataTables initialisation */
        $.extend( true, $.fn.dataTable.defaults, {
            "sDom": "<'row-fluid'<'spacol-md-12 obj-opts'f>r>t<'row-fluid'<'col-md-6'il><'col-md-4'p>>",
            "sPaginationType": "bootstrap",
            "oLanguage": {
                "sLengthMenu": "_MENU_ records per page"
            }
        } );


        /* Default class modification */
        $.extend( $.fn.dataTableExt.oStdClasses, {
            "sWrapper": "dataTables_wrapper form-inline"
        } );


        /* API method to get paging information */
        $.fn.dataTableExt.oApi.fnPagingInfo = function ( oSettings )
        {
            return {
                "iStart":         oSettings._iDisplayStart,
                "iEnd":           oSettings.fnDisplayEnd(),
                "iLength":        oSettings._iDisplayLength,
                "iTotal":         oSettings.fnRecordsTotal(),
                "iFilteredTotal": oSettings.fnRecordsDisplay(),
                "iPage":          Math.ceil( oSettings._iDisplayStart / oSettings._iDisplayLength ),
                "iTotalPages":    Math.ceil( oSettings.fnRecordsDisplay() / oSettings._iDisplayLength )
            };
        };


        /* Bootstrap style pagination control */
        $.extend( $.fn.dataTableExt.oPagination, {
            "bootstrap": {
                "fnInit": function( oSettings, nPaging, fnDraw ) {
                    var oLang = oSettings.oLanguage.oPaginate;
                    var fnClickHandler = function ( e ) {
                        e.preventDefault();
                        if ( oSettings.oApi._fnPageChange(oSettings, e.data.action) ) {
                            fnDraw( oSettings );
                        }
                    };

                    $(nPaging).addClass('pagination').append(
                        '<ul>'+
                            '<li class="prev disabled"><a href="#">&larr; '+oLang.sPrevious+'</a></li>'+
                            '<li class="next disabled"><a href="#">'+oLang.sNext+' &rarr; </a></li>'+
                            '</ul>'
                        );
                    var els = $('a', nPaging);
                    $(els[0]).bind( 'click.DT', { action: "previous" }, fnClickHandler );
                    $(els[1]).bind( 'click.DT', { action: "next" }, fnClickHandler );
                },

                "fnUpdate": function ( oSettings, fnDraw ) {
                    var iListLength = 5;
                    var oPaging = oSettings.oInstance.fnPagingInfo();
                    var an = oSettings.aanFeatures.p;
                        var i, j, sClass, iStart, iEnd, iHalf=Math.floor(iListLength/2);

                    if ( oPaging.iTotalPages < iListLength) {
                        iStart = 1;
                        iEnd = oPaging.iTotalPages;
                    }
                    else if ( oPaging.iPage <= iHalf ) {
                        iStart = 1;
                        iEnd = iListLength;
                    } else if ( oPaging.iPage >= (oPaging.iTotalPages-iHalf) ) {
                        iStart = oPaging.iTotalPages - iListLength + 1;
                        iEnd = oPaging.iTotalPages;
                    } else {
                        iStart = oPaging.iPage - iHalf + 1;
                        iEnd = iStart + iListLength - 1;
                    }

                    for ( i=0, iLen=an.length ; i<iLen ; i++ ) {
                        // Remove the middle elements
                        $('li:gt(0)', an[i]).filter(':not(:last)').remove();

                        // Add the new list items and their event handlers
                        for ( j=iStart ; j<=iEnd ; j++ ) {
                            sClass = (j==oPaging.iPage+1) ? 'class="active"' : '';
                            $('<li '+sClass+'><a href="#">'+j+'</a></li>')
                                .insertBefore( $('li:last', an[i])[0] )
                                .bind('click', function (e) {
                                    e.preventDefault();
                                    oSettings._iDisplayStart = (parseInt($('a', this).text(),10)-1) * oPaging.iLength;
                                    fnDraw( oSettings );
                                } );
                        }

                        // Add / remove disabled classes from the static elements
                        if ( oPaging.iPage === 0 ) {
                            $('li:first', an[i]).addClass('disabled');
                        } else {
                            $('li:first', an[i]).removeClass('disabled');
                        }

                        if ( oPaging.iPage === oPaging.iTotalPages-1 || oPaging.iTotalPages === 0 ) {
                            $('li:last', an[i]).addClass('disabled');
                        } else {
                            $('li:last', an[i]).removeClass('disabled');
                        }
                    }
                }
            }
        } );
    }
});


