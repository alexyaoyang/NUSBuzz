function loadBuyers(id){
$("#buyersList").empty();
    $.getJSON('/api/1.0/buzz/item?id='+id, function (json) {
		$.each(json.allBids,function(i,data) {
		$('#buyersList').append('<li data-theme="c"><a id="mailBuyer" href="" onClick="" data-transition="slide" ><div style="display: inline-block"><h5>Bid: '+data.bid+'</h5><h5>Bidder Email: '+data.nusID+'@nus.edu.sg</h5></div></a></li>').trigger('create');
		$('a[id="mailBuyer"]').attr('href','mailto:'+data.nusID+'@nus.edu.sg');
        $('#buyersList').listview().listview('refresh');
	});
});
}