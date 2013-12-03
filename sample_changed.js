EmployeeDetails = new Meteor.Collection('OneClickUsersProfileTable');
PROJECTRepository = new Meteor.Collection('ProjectRepository');
MACHINEdata = new Meteor.Collection('MachineData');
MACHINEenvironment = new Meteor.Collection('MachineEnvionmentTable');
JobSequence = new Meteor.Collection('jobsequence');
Jobs = new Meteor.Collection('jobs');

var update123 = 1;
var update1234;
var value1234;
bound_upd_message = Meteor.bindEnvironment(upd_message, function(e) {
	

	console.log("exception :" + e);
	
});
function upd_message(){
	 

	update1234= update123 +1;
	update123 = update1234;
	console.log(update1234);
	return update1234;
}


if (Meteor.isClient) {


	
// If no party selected, select one.
Meteor.startup(function () {
	

    Deps.autorun(function () {
    if (! Session.get("selected")) {
      var party = Parties.findOne();
      if (party)
        Session.set("selected", party._id);
    }
  });
});

///////////////////////////////////////////////////////////////////////////////
// Party details sidebar

Template.details.party = function () {
  return Parties.findOne(Session.get("selected"));
};

Template.details.anyParties = function () {
  return Parties.find().count() > 0;
};

Template.details.creatorName = function () {
  var owner = Meteor.users.findOne(this.Owner);
  if (owner._id === Meteor.userId())
    return "me";
  return displayName(Owner);
};

Template.details.canRemove = function () {
  return this.Owner === Meteor.userId() && attending(this) === 0;
};

Template.details.maybeChosen = function (what) {
  var myRsvp = _.find(this.rsvps, function (r) {
    return r.user === Meteor.userId();
  }) || {};

  return what == myRsvp.rsvp ? "chosen btn-inverse" : "";
};

Template.details.events({
  'click .rsvp_yes': function () {
    Meteor.call("rsvp", Session.get("selected"), "yes");
    return false;
  },
  'click .rsvp_maybe': function () {
    Meteor.call("rsvp", Session.get("selected"), "maybe");
    return false;
  },
  'click .rsvp_no': function () {
    Meteor.call("rsvp", Session.get("selected"), "no");
    return false;
  },
  'click .invite': function () {
    openInviteDialog();
    return false;
  },
  'click .remove': function () {
    Parties.remove(this._id);
    return false;
  }
});

///////////////////////////////////////////////////////////////////////////////
// Party attendance widget

Template.attendance.rsvpName = function () {
  var user = Meteor.users.findOne(this.user);
  return displayName(user);
};

Template.attendance.outstandingInvitations = function () {
  var party = Parties.findOne(this._id);
  return Meteor.users.find({$and: [
    {_id: {$in: party.invited}}, // they're invited
    {_id: {$nin: _.pluck(party.rsvps, 'user')}} // but haven't RSVP'd
  ]});
};

Template.attendance.invitationName = function () {
  return displayName(this);
};

Template.attendance.rsvpIs = function (what) {
  return this.rsvp === what;
};

Template.attendance.nobody = function () {
  return ! this.public && (this.rsvps.length + this.invited.length === 0);
};

Template.attendance.canInvite = function () {
  return ! this.public && this.owner === Meteor.userId();
};

///////////////////////////////////////////////////////////////////////////////
// Map display

// Use jquery to get the position clicked relative to the map element.
var coordsRelativeToElement = function (element, event) {
  var count1 = Parties.find().count(); 
  var offset = $(element).offset();
  var rem = count1%9;
  var qut = Math.floor(count1/9);
  var x = 55 + rem*50;
  var y =  55 + qut*50;
  return { x: x, y: y };
};

var coordsRelativeToElement_users = function (element, event) {
  var count1 = Parties.find().count(); 
  var offset = $(element).offset();
  var rem = count1%9;
  var qut = Math.floor(count1/9);
  var x = 55 + rem*50;
  var y =  55 + qut*50;
  return { x: x, y: y };
};

Template.map.events({
  'mousedown circle, mousedown text': function (event, template) {
    Session.set("selected", event.currentTarget.id);
  },
  'dblclick .map': function (event, template) {
    var coords = coordsRelativeToElement(event.currentTarget, event);
    openCreateDialog(coords.x / 500, coords.y / 500);
  }
});


Template.map_users.events({
  'mousedown circle, mousedown text': function (event, template) {
    Session.set("selected", event.currentTarget.id);
  },
  'dblclick .map_users': function (event, template) {
    if (! Meteor.userId()) // must be logged in to create events
      return;
    var coords = coordsRelativeToElement_users(event.currentTarget, event);
    openCreateDialog_users(coords.x / 500, coords.y / 500);
  }
});

Template.map1.events({
  'mousedown circle, mousedown text': function (event, template) {
    Session.set("selected", event.currentTarget.id);
  }
});

Template.map1.rendered = function () {
  var self = this;
  self.node = self.find("svg");

  if (! self.handle) {
    self.handle = Deps.autorun(function () {
      var selected = Session.get('selected');
      var selectedParty = selected && Parties.findOne(selected);
      var radius = function (party) {
        return 10 + Math.sqrt(attending(party)) * 10;
      };

      // Draw a circle for each party
      var updateCircles = function (group) {
        group.attr("id", function (party) { return party._id; })
        .attr("cx", function (party) { return party.x * 500; })
        .attr("cy", function (party) { return party.y * 500; })
        .attr("r", radius)
        .attr("class", function (party) {
          return party.public ? "public" : "private";
        })
        .style('opacity', function (party) {
          return selected === party._id ? 1 : 0.6;
        });
      };

      var circles = d3.select(self.node).select(".circles").selectAll("circle")
        .data(Parties.find().fetch(), function (party) { return party._id; });

      updateCircles(circles.enter().append("circle"));
      updateCircles(circles.transition().duration(250).ease("cubic-out"));
      circles.exit().transition().duration(250).attr("r", 0).remove();

      // Label each with the current attendance count
      var updateLabels = function (group) {
        group.attr("id", function (party) { return party._id; })
        .text(function (party) {return attending(party) || '';})
        .attr("x", function (party) { return party.x * 500; })
        .attr("y", function (party) { return party.y * 500 + radius(party)/2 })
        .style('font-size', function (party) {
          return radius(party) * 1.25 + "px";
        });
      };

      var labels = d3.select(self.node).select(".labels").selectAll("text")
        .data(Parties.find().fetch(), function (party) { return party._id; });

      updateLabels(labels.enter().append("text"));
      updateLabels(labels.transition().duration(250).ease("cubic-out"));
      labels.exit().remove();

      // Draw a dashed circle around the currently selected party, if any
      var callout = d3.select(self.node).select("circle.callout")
        .transition().duration(250).ease("cubic-out");
      if (selectedParty)
        callout.attr("cx", selectedParty.x * 500)
        .attr("cy", selectedParty.y * 500)
        .attr("r", radius(selectedParty) + 10)
        .attr("class", "callout")
        .attr("display", '');
      else
        callout.attr("display", 'none');
    });
  }
};
Template.map1.destroyed = function () {
  this.handle && this.handle.stop();
};

Template.map.destroyed = function () {
  this.handle && this.handle.stop();
};

Template.map_users.destroyed = function () {
  this.handle && this.handle.stop();
};

///////////////////////////////////////////////////////////////////////////////
// Create Party dialog

var openCreateDialog = function (x, y) {
  Session.set("createCoords", {x: x, y: y});
  Session.set("createError", null);
  Session.set("showCreateDialog", true);
};

var openCreateDialog_users = function (x, y) {
  Session.set("createCoords", {x: x, y: y});
  Session.set("createError", null);
  Session.set("showCreateDialog_users", true);
};

Template.page.showCreateDialog = function () {
  return Session.get("showCreateDialog");
};

Template.main.showCreateDialog = function () {
  return Session.get("showCreateDialog");
};

Template.main_users.showCreateDialog_users = function () {
  return Session.get("showCreateDialog_users");
};

Template.createDialog.events({
  'click .save': function (event, template) {
    var title = template.find(".title").value;
    var description = template.find(".description").value;
    var name = template.find(".name").value;
    var location = template.find(".location").value;
    var RAM = template.find(".RAM").value;
    var Harddrive = template.find(".Harddrive").value;
    var OS = template.find(".OS").value;

    var reservestatus = template.find(".reserve").checked;
    var coords = Session.get("createCoords");
    
    if (title.length && description.length) {
      Meteor.call('createParty', {
        title: title,
        description: description,
        name: name,
        location: location,
        x: coords.x,
        y: coords.y,
        RAM: RAM,
        Harddrive: Harddrive,
        OS: OS,
        reservestatus: reservestatus
      }, function (error, party) {
        if (! error) {
          Session.set("selected", party);
          if (! public && Meteor.users.find().count() > 1)
            openInviteDialog();
        }
      });
      Session.set("showCreateDialog", false);
    } else {
      Session.set("createError",
                  "It needs an environment and a description");
    }
  },

  'click .cancel': function () {
    Session.set("showCreateDialog", false);
  }
});

Template.createDialog_users.events({
  'click .save': function (event, template) {
    var first_name = template.find(".title").value;
    var last_name = template.find(".description").value;
    var location = template.find(".name").value;
    var department = template.find(".location").value;
    var designation = template.find(".RAM").value;
    var contact_details = template.find(".Harddrive").value;
    var supervisor = template.find(".OS").value;
    var admin = template.find(".reserve").checked;
    var coords = Session.get("createCoords");
    
    if (first_name.length && last_name.length) {
      Meteor.call('createParty_users', {
        first_name: first_name,
        last_name: last_name,
        location: location,
        designation: designation,
        x: coords.x,
        y: coords.y,
        department : department ,
        supervisor : supervisor ,
        contact_details: contact_details,
        admin: admin
      }, function (error, party) {
        if (! error) {
          Session.set("selected", party);
          if (! public && Meteor.users.find().count() > 1)
            openInviteDialog();
        }
      });
      Session.set("showCreateDialog_users", false);
    } else {
      Session.set("createError",
                  "It needs an environment and a description");
    }
  },

  'click .cancel': function () {
    Session.set("showCreateDialog_users", false);
  }
});

Template.createDialog.error = function () {
  return Session.get("createError");
};

Template.createDialog_users.error = function () {
  return Session.get("createError");
};
///////////////////////////////////////////////////////////////////////////////
// Invite dialog

var openInviteDialog = function () {
  Session.set("showInviteDialog", true);
};

Template.page.showInviteDialog = function () {
  return Session.get("showInviteDialog");
};

Template.inviteDialog.events({
  'click .invite': function (event, template) {
    Meteor.call('invite', Session.get("selected"), this._id);
  },
  'click .done': function (event, template) {
    Session.set("showInviteDialog", false);
    return false;
  }
});

Template.inviteDialog.uninvited = function () {
  var party = Parties.findOne(Session.get("selected"));
  if (! party)
    return []; // party hasn't loaded yet
  return Meteor.users.find({$nor: [{_id: {$in: party.invited}},
                                   {_id: party.owner}]});
};

Template.inviteDialog.displayName = function () {
  return displayName(this);
};




///////////////////////////////////////////////////////////////////////////////
// details1 dialog

Template.details1.Partynotreserve = function(){
	return Parties.find({Reserved: false});

};
Template.details1.Partyreserve = function(){
	return Parties.find({Reserved: true});

};

Template.details1.countPartyreserve = function(){
 return Parties.find({Reserved: true}).count();
};

Template.details1.countupdate123 =function(){

  return value1234;
};

Template.details1.countParty = function(){
 return Parties.find().count();
};
Template.details1.countPartynotreserve = function(){
 return Parties.find({Reserved: false}).count();
};




Template.details1.events({
  'mousedown select1': function (event, template) {
    Session.set("selected", this);
  }
});
Template.details1.creatorName = function () {
  var Owner = Meteor.users.findOne(this.Owner);
  if (Owner._id === Meteor.userId())
    return "me";
  return displayName(Owner);
};


Template.details1.rendered = function () {
  var self = this;
  self.node = self.find("svg");

  if (! self.handle) {
    self.handle = Deps.autorun(function () {
      var selected = Session.get('selected');
      var selectedParty = selected && Parties.findOne(selected);
      var radius = function (party) {
        return 10 + Math.sqrt(attending(party)) * 10;
      };
	value1234 = update1234;
      // Draw a circle for each party
      var updateCircles = function (group) {
        group.attr("id", function (party) { return party._id; })
        .attr("cx", function (party) { return party.x * 500; })
        .attr("cy", function (party) { return party.y * 500; })
        .attr("r", radius)
        .attr("class", function (party) {
          return party.public ? "public" : "private";
        })
        .style('opacity', function (party) {
          return selected === party._id ? 1 : 0.6;
        });
      };

      var circles = d3.select(self.node).select(".circles").selectAll("circle")
        .data(Parties.find().fetch(), function (party) { return party._id; });

      updateCircles(circles.enter().append("circle"));
      updateCircles(circles.transition().duration(250).ease("cubic-out"));
      circles.exit().transition().duration(250).attr("r", 0).remove();

      // Label each with the current attendance count
      var updateLabels = function (group) {
        group.attr("id", function (party) { return party._id; })
        .text(function (party) {return attending(party) || '';})
        .attr("x", function (party) { return party.x * 500; })
        .attr("y", function (party) { return party.y * 500 + radius(party)/2 })
        .style('font-size', function (party) {
          return radius(party) * 1.25 + "px";
        });
      };

      var labels = d3.select(self.node).select(".labels").selectAll("text")
        .data(Parties.find().fetch(), function (party) { return party._id; });

      updateLabels(labels.enter().append("text"));
      updateLabels(labels.transition().duration(250).ease("cubic-out"));
      labels.exit().remove();

      // Draw a dashed circle around the currently selected party, if any
      var callout = d3.select(self.node).select("circle.callout")
        .transition().duration(250).ease("cubic-out");
      if (selectedParty)
        callout.attr("cx", selectedParty.x * 500)
        .attr("cy", selectedParty.y * 500)
        .attr("r", radius(selectedParty) + 10)
        .attr("class", "callout")
        .attr("display", '');
      else
        callout.attr("display", 'none');
    });
  }
};
Template.details1.destroyed = function () {
  this.handle && this.handle.stop();
};





///////////////////////////////////////////////////////////////////////////////
// details3 dialog

Template.details3.Partynotreserve = function(){
	return Parties.find({Reserved: false,Environment:"build"});

};
Template.details3.Partyreserve = function(){
	return Parties.find({Reserved: true,Environment:"build"});

};

Template.details3.countPartyreserve = function(){
 return Parties.find({Reserved: true,Environment:"build"}).count();
};

Template.details3.countupdate123 =function(){

  return value1234;
};

Template.details3.countParty = function(){
 return Parties.find({Environment:"build"}).count();
};
Template.details3.countPartynotreserve = function(){
 return Parties.find({Reserved: false,Environment:"build"}).count();
};




Template.details3.events({
  'mousedown select1': function (event, template) {
    Session.set("selected", this);
  }
});
Template.details3.creatorName = function () {
  var Owner = Meteor.users.findOne(this.Owner);
  if (Owner._id === Meteor.userId())
    return "me";
  return displayName(Owner);
};


Template.details3.rendered = function () {
  var self = this;
  self.node = self.find("svg");

  if (! self.handle) {
    self.handle = Deps.autorun(function () {
      var selected = Session.get('selected');
      var selectedParty = selected && Parties.findOne(selected);
      var radius = function (party) {
        return 10 + Math.sqrt(attending(party)) * 10;
      };
	value1234 = update1234;
      // Draw a circle for each party
      var updateCircles = function (group) {
        group.attr("id", function (party) { return party._id; })
        .attr("cx", function (party) { return party.x * 500; })
        .attr("cy", function (party) { return party.y * 500; })
        .attr("r", radius)
        .attr("class", function (party) {
          return party.public ? "public" : "private";
        })
        .style('opacity', function (party) {
          return selected === party._id ? 1 : 0.6;
        });
      };

      var circles = d3.select(self.node).select(".circles").selectAll("circle")
        .data(Parties.find().fetch(), function (party) { return party._id; });

      updateCircles(circles.enter().append("circle"));
      updateCircles(circles.transition().duration(250).ease("cubic-out"));
      circles.exit().transition().duration(250).attr("r", 0).remove();

      // Label each with the current attendance count
      var updateLabels = function (group) {
        group.attr("id", function (party) { return party._id; })
        .text(function (party) {return attending(party) || '';})
        .attr("x", function (party) { return party.x * 500; })
        .attr("y", function (party) { return party.y * 500 + radius(party)/2 })
        .style('font-size', function (party) {
          return radius(party) * 1.25 + "px";
        });
      };

      var labels = d3.select(self.node).select(".labels").selectAll("text")
        .data(Parties.find().fetch(), function (party) { return party._id; });

      updateLabels(labels.enter().append("text"));
      updateLabels(labels.transition().duration(250).ease("cubic-out"));
      labels.exit().remove();

      // Draw a dashed circle around the currently selected party, if any
      var callout = d3.select(self.node).select("circle.callout")
        .transition().duration(250).ease("cubic-out");
      if (selectedParty)
        callout.attr("cx", selectedParty.x * 500)
        .attr("cy", selectedParty.y * 500)
        .attr("r", radius(selectedParty) + 10)
        .attr("class", "callout")
        .attr("display", '');
      else
        callout.attr("display", 'none');
    });
  }
};
Template.details3.destroyed = function () {
  this.handle && this.handle.stop();
};


Template.details2.Partynotreserve = function(){
	return Parties.find({Reserved: false,Environment:"Testing"});

};
Template.details2.Partyreserve = function(){
	return Parties.find({Reserved: true,Environment:"Testing"});

};

Template.details2.countPartyreserve = function(){
 return Parties.find({Reserved: true,Environment:"Testing"}).count();
};

Template.details2.countupdate123 =function(){

  return value1234;
};

Template.details2.countParty = function(){
 return Parties.find({Environment:"Testing"}).count();
};
Template.details2.countPartynotreserve = function(){
 return Parties.find({Reserved: false,Environment:"Testing"}).count();
};

Template.details2.events({
  'mousedown select1': function (event, template) {
    Session.set("selected", this);
  }
});
Template.details2.creatorName = function () {
  var Owner = Meteor.users.findOne(this.Owner);
  if (Owner._id === Meteor.userId())
    return "me";
  return displayName(Owner);
};


Template.details2.rendered = function () {
  var self = this;
  self.node = self.find("svg");

  if (! self.handle) {
    self.handle = Deps.autorun(function () {
      var selected = Session.get('selected');
      var selectedParty = selected && Parties.findOne(selected);
      var radius = function (party) {
        return 10 + Math.sqrt(attending(party)) * 10;
      };
	value1234 = update1234;
      // Draw a circle for each party
      var updateCircles = function (group) {
        group.attr("id", function (party) { return party._id; })
        .attr("cx", function (party) { return party.x * 500; })
        .attr("cy", function (party) { return party.y * 500; })
        .attr("r", radius)
        .attr("class", function (party) {
          return party.public ? "public" : "private";
        })
        .style('opacity', function (party) {
          return selected === party._id ? 1 : 0.6;
        });
      };

      var circles = d3.select(self.node).select(".circles").selectAll("circle")
        .data(Parties.find().fetch(), function (party) { return party._id; });

      updateCircles(circles.enter().append("circle"));
      updateCircles(circles.transition().duration(250).ease("cubic-out"));
      circles.exit().transition().duration(250).attr("r", 0).remove();

      // Label each with the current attendance count
      var updateLabels = function (group) {
        group.attr("id", function (party) { return party._id; })
        .text(function (party) {return attending(party) || '';})
        .attr("x", function (party) { return party.x * 500; })
        .attr("y", function (party) { return party.y * 500 + radius(party)/2 })
        .style('font-size', function (party) {
          return radius(party) * 1.25 + "px";
        });
      };

      var labels = d3.select(self.node).select(".labels").selectAll("text")
        .data(Parties.find().fetch(), function (party) { return party._id; });

      updateLabels(labels.enter().append("text"));
      updateLabels(labels.transition().duration(250).ease("cubic-out"));
      labels.exit().remove();

      // Draw a dashed circle around the currently selected party, if any
      var callout = d3.select(self.node).select("circle.callout")
        .transition().duration(250).ease("cubic-out");
      if (selectedParty)
        callout.attr("cx", selectedParty.x * 500)
        .attr("cy", selectedParty.y * 500)
        .attr("r", radius(selectedParty) + 10)
        .attr("class", "callout")
        .attr("display", '');
      else
        callout.attr("display", 'none');
    });
  }
};
Template.details2.destroyed = function () {
  this.handle && this.handle.stop();
};


Template.main_users.user_profile = function(){
return Meteor.users.find({_id: Meteor.userId()});
};


Template.reservation.reserved = function(){
   return party.reservestatus;
};

}


if (Meteor.isServer) {

}
