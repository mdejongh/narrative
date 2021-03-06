//----------------------------------------------------------------------------
//  Copyright (C) 2008-2011  The IPython Development Team
//
//  Distributed under the terms of the BSD License.  The full license is in
//  the file COPYING, distributed as part of this software.
//----------------------------------------------------------------------------

//============================================================================
// NotebookList
//============================================================================

var IPython = (function (IPython) {

    var NotebookList = function (selector) {
        this.selector = selector;
        if (this.selector !== undefined) {
            this.element = $(selector);
            this.style();
            this.bind_events();
        }
    };

    NotebookList.prototype.baseProjectUrl = function () {
        return $('body').data('baseProjectUrl')
    };

    NotebookList.prototype.style = function () {
        $('#notebook_toolbar').addClass('list_toolbar');
        $('#drag_info').addClass('toolbar_info');
        $('#notebook_buttons').addClass('toolbar_buttons');
        $('#notebook_list_header').addClass('list_header');
        this.element.addClass("list_container");
    };


    NotebookList.prototype.bind_events = function () {
        var that = this;
        $('#refresh_notebook_list').click(function () {
            that.load_list();
        });
        this.element.bind('dragover', function () {
            return false;
        });
        this.element.bind('drop', function(event){
            that.handelFilesUpload(event,'drop');
            return false;
        });
	/* Bind handlers to login/logout that set/clear tokens and reloads the notebook list */
	$(document).on('cookie_set.kbase', function(event, token) {
			   console.log('Loading notebook list for ',$("#login-widget").kbaseLogin("session", "user_id") );
			   that.load_list();
	});
    };

    NotebookList.prototype.handelFilesUpload =  function(event, dropOrForm) {
        var that = this;
        var files;
        if(dropOrForm =='drop'){
            files = event.originalEvent.dataTransfer.files;
        } else 
        {
            files = event.originalEvent.target.files
        }
        for (var i = 0, f; f = files[i]; i++) {
            var reader = new FileReader();
            reader.readAsText(f);
            var fname = f.name.split('.'); 
            var nbname = fname.slice(0,-1).join('.');
            var nbformat = fname.slice(-1)[0];
            if (nbformat === 'ipynb') {nbformat = 'json';};
            if (nbformat === 'py' || nbformat === 'json') {
                var item = that.new_notebook_item(0);
                that.add_name_input(nbname, item);
                item.data('nbformat', nbformat);
                // Store the notebook item in the reader so we can use it later
                // to know which item it belongs to.
                $(reader).data('item', item);
                reader.onload = function (event) {
                    var nbitem = $(event.target).data('item');
                    that.add_notebook_data(event.target.result, nbitem);
                    that.add_upload_button(nbitem);
                };
            };
        }
        return false;
        };

    NotebookList.prototype.clear_list = function () {
        this.element.children('.list_item').remove();
    };


    NotebookList.prototype.load_list = function () {
        var that = this;
	var token = $("#login-widget").kbaseLogin("session", "token");
	console.log( "Reloading notebook list")
        var settings = {
            processData : false,
            cache : false,
            type : "GET",
            dataType : "json",
	    headers : {
		'authorization' : 'OAuth ' + token
	    },
            success : $.proxy(this.list_loaded, this),
            error : $.proxy( function(){
                that.list_loaded([], null, null, {msg:"Error connecting to server."});
                             },this)
        };

        var url = this.baseProjectUrl() + 'notebooks';
        $.ajax(url, settings);
    };


    NotebookList.prototype.list_loaded = function (data, status, xhr, param) {
        var message = 'Notebook list empty.';
        if (param !== undefined && param.msg) {
            var message = param.msg;
        }
        var len = data.length;
        this.clear_list();

        if(len == 0)
        {
            $(this.new_notebook_item(0))
                .append(
                    $('<div style="margin:auto;text-align:center;color:grey"/>')
                    .text(message)
                    )
        }

        for (var i=0; i<len; i++) {
            var notebook_id = data[i].notebook_id;
            var nbname = data[i].name;
            var kernel = data[i].kernel_id;
            var item = this.new_notebook_item(i);
            this.add_link(notebook_id, nbname, item);
            // hide delete buttons when readonly
            if(kernel == null){
                this.add_delete_button(item);
            } else {
                this.add_shutdown_button(item,kernel);
            }
        };
    };


    NotebookList.prototype.new_notebook_item = function (index) {
        var item = $('<div/>').addClass("list_item").addClass("row-fluid");
        // item.addClass('list_item ui-widget ui-widget-content ui-helper-clearfix');
        // item.css('border-top-style','none');
        item.append($("<div/>").addClass("span12").append(
            $("<a/>").addClass("item_link").append(
                $("<span/>").addClass("item_name")
            )
        ).append(
            $('<div/>').addClass("item_buttons btn-group pull-right")
        ));
        
        if (index === -1) {
            this.element.append(item);
        } else {
            this.element.children().eq(index).after(item);
        }
        return item;
    };


    NotebookList.prototype.add_link = function (notebook_id, nbname, item) {
        item.data('nbname', nbname);
        item.data('notebook_id', notebook_id);
        item.find(".item_name").text(nbname);
        item.find("a.item_link")
            .attr('href', this.baseProjectUrl()+notebook_id)
            .attr('target','_blank');
    };


    NotebookList.prototype.add_name_input = function (nbname, item) {
        item.data('nbname', nbname);
        item.find(".item_name").empty().append(
            $('<input/>')
            .addClass("nbname_input")
            .attr('value', nbname)
            .attr('size', '30')
            .attr('type', 'text')
        );
    };


    NotebookList.prototype.add_notebook_data = function (data, item) {
        item.data('nbdata',data);
    };


    NotebookList.prototype.add_shutdown_button = function (item, kernel) {
        var that = this;
	var token = $("#login-widget").kbaseLogin("session", "token");
        var shutdown_button = $("<button/>").text("Shutdown").addClass("btn btn-default btn-xs").
            click(function (e) {
                var settings = {
                    processData : false,
                    cache : false,
                    type : "DELETE",
		    headers : {
			'authorization' : 'OAuth ' + token
		    },
                    dataType : "json",
                    success : function (data, status, xhr) {
                        that.load_list();
                    }
                };
                var url = that.baseProjectUrl() + 'kernels/'+kernel;
                $.ajax(url, settings);
                return false;
            });
        // var new_buttons = item.find('a'); // shutdown_button;
        item.find(".item_buttons").html("").append(shutdown_button);
    };

    NotebookList.prototype.add_delete_button = function (item) {
        var new_buttons = $('<span/>').addClass("btn-group pull-right");
        var notebooklist = this;
        var delete_button = $("<button/>").text("Delete").addClass("btn btn-default btn-xs").
            click(function (e) {
                // $(this) is the button that was clicked.
                var that = $(this);
                // We use the nbname and notebook_id from the parent notebook_item element's
                // data because the outer scopes values change as we iterate through the loop.
                var parent_item = that.parents('div.list_item');
                var nbname = parent_item.data('nbname');
                var notebook_id = parent_item.data('notebook_id');
		var token = $("#login-widget").kbaseLogin("session", "token");
                var message = 'Are you sure you want to permanently delete the notebook: ' + nbname + '?';
                IPython.dialog.modal({
                    title : "Delete notebook",
                    body : message,
                    buttons : {
                        Delete : {
                            class: "btn-danger",
                            click: function() {
                                var settings = {
                                    processData : false,
                                    cache : false,
                                    type : "DELETE",
				    headers : {
					'authorization' : 'OAuth ' + token
				    },
                                    dataType : "json",
                                    success : function (data, status, xhr) {
                                        parent_item.remove();
                                    }
                                };
                                var url = notebooklist.baseProjectUrl() + 'notebooks/' + notebook_id;
                                $.ajax(url, settings);
                            }
                        },
                        Cancel : {}
                    }
                });
                return false;
            });
        item.find(".item_buttons").html("").append(delete_button); 
   };


    NotebookList.prototype.add_upload_button = function (item) {
        var that = this;
        var upload_button = $('<button/>').text("Upload")
            .addClass('btn btn-primary btn-xs upload_button')
            .click(function (e) {
                var nbname = item.find('.item_name > input').attr('value');
                var nbformat = item.data('nbformat');
                var nbdata = item.data('nbdata');
                var content_type = 'text/plain';
		var token = $("#login-widget").kbaseLogin("session", "token");
                if (nbformat === 'json') {
                    content_type = 'application/json';
                } else if (nbformat === 'py') {
                    content_type = 'application/x-python';
                };
		var token = $("#login-widget").kbaseLogin("session", "token");
                var settings = {
                    processData : false,
                    cache : false,
                    type : 'POST',
                    dataType : 'json',
                    data : nbdata,
                    headers : {'Content-Type': content_type,	
		       'authorization' : 'OAuth ' + token },
                    success : function (data, status, xhr) {
                        that.add_link(data, nbname, item);
                        that.add_delete_button(item);
                    }
                };

                var qs = $.param({name:nbname, format:nbformat});
                var url = that.baseProjectUrl() + 'notebooks?' + qs;
                $.ajax(url, settings);
                return false;
            });
        var cancel_button = $('<button/>').text("Cancel")
            .addClass("btn btn-default btn-xs")
            .click(function (e) {
                console.log('cancel click');
                item.remove();
                return false;
            });
        item.find(".item_buttons").empty()
            .append(upload_button)
            .append(cancel_button);
    };


    IPython.NotebookList = NotebookList;

    return IPython;

}(IPython));

