function validateSellForm()
{
    var n=document.forms["sellForm"]["name"].value;
    var d=document.forms["sellForm"]["detail"].value;
    var c=document.forms["sellForm"]["category"].value;
    var t=document.forms["sellForm"]["tags"].value;
    if (n==null || n=="")
    {
        alert("Item name must be filled out!");
        return false;
    }
    else if (d==null || d=="")
    {
        alert("Item detail must be filled out!");
        return false;
    }
    else if (c=="Category")
    {
        alert("Choose a Category!");
        return false;
    }
    else if (t==null || t=="")
    {
        alert("Item tags must be filled out!");
        return false;
    }
    else
        alert("Item created!");
}