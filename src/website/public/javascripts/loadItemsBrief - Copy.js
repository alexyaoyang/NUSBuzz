function loadItemsBrief(cat){
    $.getJSON('/api/1.0/buzz/item/find?v=true&category='+cat, function (json) {
		$.each(json.items,function(i,data) {
			$('li[id="'+(i+1)+'"]').attr('style','display:');
			$('img[id="'+(i+1)+'"]').attr('src','https://ec2-54-245-54-168.us-west-2.compute.amazonaws.com/api/1.0/resource?q='+data.fileUrls[0]);
			$('h3[id="title'+(i+1)+'"]').text('Title: '+data.name);
			$('h3[id="minBid'+(i+1)+'"]').text('Minimum Bid: '+data.minBid);
			$('h3[id="condition'+(i+1)+'"]').text('Condition: '+data.condition);
			//$('h3[id="noBidders1"]').text('No. of Bidders: '+data.allBids.length());
		});
	});
}