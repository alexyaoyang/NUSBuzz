function loadSearch(key){
    $("#searchList").empty();
    $("#searchIn").attr('value','');
    $.getJSON('/api/1.0/buzz/item/find?v=true&name='+key, function (json) {
		$.each(json.items,function(i,data) {
		$('#searchList').append('<li data-theme="c"><a id="touchableButton" href="#viewItemDetail" onClick="return loadItemDetailed(\''+data._id+'\');" data-transition="slide" class="touchableButton"><div style="display: inline-block"><img style="width: 100px" src="https://ec2-54-245-54-168.us-west-2.compute.amazonaws.com/api/1.0/resource?q='+data.fileUrls[0]+'"></div><div style="display: inline-block"><h5>Title: '+data.name+'</h5><h5>Minimum Bid: '+data.minBid+'</h5><h5>Condition: '+data.condition+'</h5></div></a></li>').trigger('create');
		$('#searchList').listview().listview('refresh');
	});
});
}