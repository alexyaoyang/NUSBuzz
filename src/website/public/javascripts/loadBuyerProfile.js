
/** In ./website/public/javascripts/dashboardDetails.js **/

//$(document).ready(function() {
    $.getJSON('/api/1.0/user/details', function (data) {
	$('input[id="handphone"]').val(data.handphone);
	$('input[id="nusID"]').val(data.nusID);
	$('input[id="name"]').val(data.name);
	$('input[id="email"]').val(data.email);
	$('input[id="dateJoin"]').val(data.dateJoin);
	$('input[id="rep"]').val(data.rep);
	$('select[id="alerts"]').val(data.alerts);
    });
//});