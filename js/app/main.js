define(['jquery', 'mustache', 'crossroads', 'hasher'], function(jq, Mustache, crossroads, hasher) {
	function JsAutoP(s) {
	  if (!s || s.search(/\n|\r/) == -1) {
	    return s;
	  }
	  var  X = function(x, a, b) {return x.replace(new RegExp(a, 'g'), b)};
	  var  R = function(a, b) {return s = X(s, a, b)};
	  var blocks = '(table|thead|tfoot|caption|colgroup|tbody|tr|td|th|div|dl|dd|dt|ul|ol|li|pre|select'
	  blocks += '|form|blockquote|address|math|style|script|object|input|param|p|h[1-6])';
	  s += '\n';
	  R('<br />\\s*<br />', '\n\n');
	  R('(<' + blocks + '[^>]*>)', '\n$1');
	  R('(</' + blocks + '>)', '$1\n\n');
	  R('\r\n|\r', '\n'); // cross-platform newlines
	  R('\n\n+', '\n\n');// take care of duplicates
	  R('\n?((.|\n)+?)\n\\s*\n', '<p>$1</p>\n');// make paragraphs
	  R('\n?((.|\n)+?)$', '<p>$1</p>\n');//including one at the end
	  R('<p>\\s*?</p>', '');// under certain strange conditions it could create a P of entirely whitespace
	  R('<p>(<div[^>]*>\\s*)', '$1<p>');
	  R('<p>([^<]+)\\s*?(</(div|address|form)[^>]*>)', '<p>$1</p>$2');
	  R('<p>\\s*(</?' + blocks + '[^>]*>)\\s*</p>', '$1');
	  R('<p>(<li.+?)</p>', '$1');// problem with nested lists
	  R('<p><blockquote([^>]*)>', '<blockquote$1><p>');
	  R('</blockquote></p>', '</p></blockquote>');
	  R('<p>\\s*(</?' + blocks + '[^>]*>)', '$1');
	  R('(</?' + blocks + '[^>]*>)\\s*</p>', '$1');
	  R('<(script|style)(.|\n)*?</\\1>', function(m0) {return X(m0, '\n', '<PNL>')});
	  R('(<br />)?\\s*\n', '<br />\n');
	  R('<PNL>', '\n');
	  R('(</?' + blocks + '[^>]*>)\\s*<br />', '$1');
	  R('<br />(\\s*</?(p|li|div|dl|dd|dt|th|pre|td|ul|ol)[^>]*>)', '$1');
	  if (s.indexOf('<pre') != -1) {
	    R('(<pre(.|\n)*?>)((.|\n)*?)</pre>', function(m0, m1, m2, m3) {
	      return X(m1, '\\\\([\'\"\\\\])', '$1') + X(X(X(m3, '<p>', '\n'), '</p>|<br />', ''), '\\\\([\'\"\\\\])', '$1') + '</pre>';
	    });
	  }
	  return R('\n</p>$', '</p>');
	}

	current_page = 1;

	function get_recent(page) {
		var url = 'http://localhost:3000/library/?page=' + page;

		clearPanels();
		jq.getJSON(url, function(data, status, jqXHR) {
			var templateData = {'books': data['books']};
			var template = jq('#book-list-template').html();
			Mustache.parse(template);
			var rendered = Mustache.render(template, templateData);
			jq("#book-list").html(rendered);
			
			jq('#book-list .book').on('click', function() {
				var id = jq(this).data('id');
				jq("#book-list").fadeOut('fast', function() {
					hasher.setHash('book/' + id);
				});
			});

			var next_page = data['next-page'];
			var prev_page = data['prev-page'];

			if (!next_page) {
				jq("#book-list-pager button.next").attr('disabled', 'disabled');
			} else {
				jq("#book-list-pager button.next").removeAttr('disabled');
			}

			if (!prev_page) {
				jq("#book-list-pager button.prev").attr('disabled', 'disabled');
			} else {
				jq("#book-list-pager button.prev").removeAttr('disabled');
			}

			jq("#book-list-pager button.next").on('click', function() {
				hasher.setHash('page/' + ++current_page);
			});

			jq("#book-list-pager button.prev").on('click', function() {
				hasher.setHash('page/' + --current_page);
			});
			

			jq("#book-list").fadeIn();
		});
	}

	var route_home = crossroads.addRoute('/', function() {
		get_recent(1);
	});

	var route_home_paged = crossroads.addRoute('/page/{page}', function(page) {
		get_recent(page);
	});

	var route_book = crossroads.addRoute('/book/{slug}', function(slug) {
		clearPanels();
		jq.getJSON('http://localhost:3000/book/' + slug, function(data, status, jqXHR) {
			data['description'] = JsAutoP(data['description']);
			var templateData = {'book': data};
			var template = jq('#book-detail-template').html();
			Mustache.parse(template);
			var rendered = Mustache.render(template, templateData);
			jq("#book-detail").html(rendered);
			jq("#book-detail").fadeIn();
		});
	});

	function clearPanels() {
		jq('.content-panel').html('').hide();
	}

	//setup hasher
	function parseHash(newHash, oldHash){
	  crossroads.parse(newHash);
	}
	hasher.initialized.add(parseHash); //parse initial hash
	hasher.changed.add(parseHash); //parse hash changes
	hasher.init(); //start listening for history change
});