function pass_change() {
	var parent	= document.getElementById('signup_passwords');
	var first	= document.getElementById('signup_pass');
	var other	= document.getElementById('signup_pass_2');
	var msg		= document.getElementById('signup_error');

	if(0 == first.value.length
	|| 0 == other.value.length)
	{
		parent.className = 'form-group';
		msg.innerHTML = '';

	}
	else if(first.value != other.value)
	{
		parent.className = 'form-group has-error';
		msg.innerHTML = 'The passwords does not match';
	}
	else
	{
		parent.className = 'form-group has-success';
		msg.innerHTML = '';
	}
}

function signup_ok() {
	var first = document.getElementById('signup_pass');
	var other = document.getElementById('signup_pass_2');
	return (first.value == other.value) && first.value.length > 0;
}

function preview_image(event) {
	var reader = new FileReader();
	reader.onload = function() {
		document.getElementById('clan_logo_preview').src = reader.result;
	}
	reader.readAsDataURL(event.target.files[0]);
}

function toggle_slot(name) {
	var btn = document.getElementById('btn_' + name);
	var val = document.getElementById(name);

	if('open' == val.value) {
		val.value = 'request';
		btn.className = 'btn btn-default btn-danger btn-slot';
		btn.innerHTML = 'Request';
	} else {
		val.value = 'open';
		btn.className = 'btn btn-default btn-success btn-slot';
		btn.innerHTML = 'Open';
	}
	return false;
}

function async_request(meth, url, data, cb) {
	var request = new XMLHttpRequest();
	var params = []
	request.open(meth, url, true);
	request.onreadystatechange = function() {
		cb(request);
	};
	request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');

	for(var it in data) {
		if(data.hasOwnProperty(it)) {
			params.push(encodeURIComponent(it) + "=" + encodeURIComponent(data[it]))
		}
	}

	request.send(params.join("&"));
}

function toggle_slot(obj, slot) {
	async_request('PUT', ('open' == obj.value) ? '/requestslot' : '/openslot', { slot: slot }, function(xhttp) {
		if(4 == xhttp.readyState && 200 == xhttp.status) {
			str = document.getElementById('slot_' + slot);
			if('open' == xhttp.responseText) {
				str.innerHTML = 'Open';
				obj.value = 'open';
			} else {
				str.innerHTML = 'Request';
				obj.value = 'request';
			}
		}
	});
}


