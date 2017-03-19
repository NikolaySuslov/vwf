"use strict";

// VWF & A-Frame model driver
// Copyright 2017 Krestianstvo.org project
//
// Copyright 2012 United States Government, as represented by the Secretary of Defense, Under
// Secretary of Defense (Personnel & Readiness).
// 
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
// 
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software distributed under the License
// is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
// or implied. See the License for the specific language governing permissions and limitations under
// the License.

/// vwf/model/scenejs.js is a placeholder for a 3-D scene manager.
/// 
/// @module vwf/model/aframe
/// @requires vwf/model

define(["module", "vwf/model", "vwf/utility"], function (module, model, utility) {

    return model.load(module, {

        // == Module Definition ====================================================================

        // -- initialize ---------------------------------------------------------------------------

        initialize: function () {

            self = this;

            this.state = {
                nodes: {},
                scenes: {},
                prototypes: {},
                createLocalNode: function (nodeID, childID, childExtendsID, childImplementsIDs,
                    childSource, childType, childIndex, childName, callback) {
                    return {
                        "parentID": nodeID,
                        "ID": childID,
                        "extendsID": childExtendsID,
                        "implementsIDs": childImplementsIDs,
                        "source": childSource,
                        "type": childType,
                        "name": childName,
                        "prototypes": undefined,
                        "aframeObj": undefined,
                        "scene": undefined
                    };
                },
                isAFrameClass: function (prototypes, classID) {
                    if (prototypes) {
                        for (var i = 0; i < prototypes.length; i++) {
                            if (prototypes[i] === classID) {
                                //console.info( "prototypes[ i ]: " + prototypes[ i ] );
                                return true;
                            }
                        }
                    }
                    return false;
                },
                isAFrameComponent: function (prototypes) {
                    var found = false;
                    if (prototypes) {
                        for (var i = 0; i < prototypes.length && !found; i++) {
                            found = (prototypes[i] === "http://vwf.example.com/aframe/node.vwf");
                        }
                    }
                    return found;
                }
            };

            this.state.kernel = this.kernel.kernel.kernel;


        },

        // == Model API ============================================================================

        // -- creatingNode -------------------------------------------------------------------------

        creatingNode: function (nodeID, childID, childExtendsID, childImplementsIDs,
            childSource, childType, childIndex, childName, callback /* ( ready ) */) {

            // If the parent nodeID is 0, this node is attached directly to the root and is therefore either 
            // the scene or a prototype.  In either of those cases, save the uri of the new node
            var childURI = (nodeID === 0 ? childIndex : undefined);
            var appID = this.kernel.application();

            // If the node being created is a prototype, construct it and add it to the array of prototypes,
            // and then return
            var prototypeID = utility.ifPrototypeGetId(appID, this.state.prototypes, nodeID, childID);
            if (prototypeID !== undefined) {

                this.state.prototypes[prototypeID] = {
                    parentID: nodeID,
                    ID: childID,
                    extendsID: childExtendsID,
                    implementsID: childImplementsIDs,
                    source: childSource,
                    type: childType,
                    name: childName
                };
                return;
            }

            var protos = getPrototypes(this.kernel, childExtendsID);
            //var kernel = this.kernel.kernel.kernel;
            var node;

            if (this.state.isAFrameComponent(protos)) {

                // Create the local copy of the node properties
                if (this.state.nodes[childID] === undefined) {
                    this.state.nodes[childID] = this.state.createLocalNode(nodeID, childID, childExtendsID, childImplementsIDs,
                        childSource, childType, childIndex, childName, callback);
                }

                node = this.state.nodes[childID];
                node.prototypes = protos;

                node.aframeObj = createAFrameObject(node);
                addNodeToHierarchy(node);
                //notifyDriverOfPrototypeAndBehaviorProps();
            }


        },

        // -- initializingProperty -----------------------------------------------------------------

        initializingProperty: function (nodeID, propertyName, propertyValue) {

            var value = undefined;
            var node = this.state.nodes[nodeID];
            if (node !== undefined) {
                value = this.settingProperty(nodeID, propertyName, propertyValue);
            }
            return value;
        },

        // -- creatingProperty ---------------------------------------------------------------------

        creatingProperty: function (nodeID, propertyName, propertyValue) {

            return this.initializingProperty(nodeID, propertyName, propertyValue);
        },

        // -- deletingNode -------------------------------------------------------------------------

        //deletingNode: function( nodeID ) {
        //},

        // -- settingProperty ----------------------------------------------------------------------

        settingProperty: function (nodeID, propertyName, propertyValue) {

            var node = this.state.nodes[nodeID];
            var value = undefined;
            if (node && node.aframeObj && utility.validObject(propertyValue)) {

                var aframeObject = node.aframeObj;

                if (isNodeDefinition(node.prototypes)) {

                    // 'id' will be set to the nodeID
                    value = propertyValue;

                    if (!aframeObject) return value;

                    if (propertyValue !== undefined) {
                        //self = this;


                        if (aframeObject instanceof AFRAME.AEntity) {

                            switch (propertyName) {

                                case "position":
                                    aframeObject.setAttribute('position', { x: propertyValue[0], y: propertyValue[1], z: propertyValue[2] });
                                    break;
                                case "rotation":
                                    aframeObject.setAttribute('rotation', { x: propertyValue[0], y: propertyValue[1], z: propertyValue[2] });
                                    break;

                                case "color":
                                    aframeObject.setAttribute('material', 'color', propertyValue);
                                    break;
                                case "wireframe":
                                    aframeObject.setAttribute('material', 'wireframe', propertyValue);
                                    break;
                                case "wireframe-linewidth":
                                    aframeObject.setAttribute('material', 'wireframe-linewidth', propertyValue);
                                    break;

                                case "clickable":
                                    if (propertyValue) {
                                        aframeObject.addEventListener('click', function (evt) {
                                            self.kernel.fireEvent(node.ID, "clickEvent");
                                        });
                                    }
                                    break;
                            }

                            if (aframeObject.nodeName == "A-TEXT") {
                                switch (propertyName) {

                                    case "value":
                                        aframeObject.setAttribute('text', 'value', propertyValue);
                                        break;

                                    case "textColor":
                                        aframeObject.setAttribute('text', 'color', propertyValue);
                                        break;

                                }
                            }

                            if (aframeObject.nodeName == "A-SCENE") {
                                switch (propertyName) {
                                    case "fog":
                                        aframeObject.setAttribute('fog', propertyValue);
                                        break;
                                }
                            }

                            if (aframeObject.nodeName == "A-BOX") {
                                switch (propertyName) {

                                    case "depth":
                                        aframeObject.setAttribute('geometry', 'depth', propertyValue);
                                        break;
                                }
                            }

                            if (aframeObject.nodeName == "A-PLANE") {
                                switch (propertyName) {

                                    case "height":
                                        aframeObject.setAttribute('material', 'height', propertyValue);
                                        break;
                                    case "width":
                                        aframeObject.setAttribute('material', 'width', propertyValue);
                                        break;
                                }
                            }

                            if (aframeObject.nodeName == "A-SPHERE") {
                                switch (propertyName) {

                                    case "radius":
                                        aframeObject.setAttribute('geometry', 'radius', propertyValue);
                                        break;
                                }
                            }

                            if (aframeObject.nodeName == "A-CAMERA") {
                                switch (propertyName) {

                                    case "look-controls-enabled":
                                        aframeObject.setAttribute('look-controls', 'enabled', propertyValue);
                                        break;

                                    case "forAvatar":
                                        if (propertyValue) {
                                            aframeObject.addEventListener('componentchanged', function (evt) {

                                                if (evt.detail.name === 'position') {
                                                    self.kernel.fireEvent(node.ID, "setAvatarPosition", evt.detail.newData);
                                                 
                                                }
                                                if (evt.detail.name === 'rotation') {
                                                    self.kernel.fireEvent(node.ID, "setAvatarRotation", evt.detail.newData);
                                                    //console.log('Entity has moved from', evt.detail.oldData, 'to', evt.detail.newData, '!');
                                                }
                                            });
                                        }
                                        break;
                                }
                            }
                        }
                    }
                }

            }
            return value;
        },

        // -- gettingProperty ----------------------------------------------------------------------

        gettingProperty: function (nodeID, propertyName, propertyValue) {


            var node = this.state.nodes[nodeID];
            var value = undefined;

            if (node && node.aframeObj) {

                var aframeObject = node.aframeObj;

                if (isNodeDefinition(node.prototypes)) {

                    if (!aframeObject) return value;
                   // self = this;

                    if (aframeObject instanceof AFRAME.AEntity) {

                        switch (propertyName) {

                            case "position":
                                var pos = aframeObject.getAttribute('position');
                                value = [pos.x, pos.y, pos.z];
                                break;

                            case "rotation":
                                var rot = aframeObject.getAttribute('rotation');
                                value = [rot.x, rot.y, rot.z];
                                break;

                            case "color":
                                value = aframeObject.getAttribute('material').color;
                                break;

                            case "wireframe":
                                value = aframeObject.getAttribute('material').wireframe;
                                break;

                            case "wireframe-linewidth":
                                value = aframeObject.getAttribute('material').wireframe - linewidth;
                                break;

                            case "clickable":
                                value
                                break;

                        }

                        if (aframeObject.nodeName == "A-SCENE") {
                            switch (propertyName) {

                                case "fog":
                                    value = aframeObject.getAttribute('fog');
                                    break;
                            }
                        }

                        if (aframeObject.nodeName == "A-BOX") {
                            switch (propertyName) {

                                case "depth":
                                    value = aframeObject.getAttribute('geometry').depth;
                                    break;
                            }
                        }
                        if (aframeObject.nodeName == "A-PLANE") {
                            switch (propertyName) {

                                case "height":
                                    value = aframeObject.getAttribute('material').height;
                                    break;
                                case "width":
                                    value = aframeObject.getAttribute('material').width;
                                    break;
                            }
                        }

                        if (aframeObject.nodeName == "A-SPHERE") {
                            switch (propertyName) {

                                case "radius":
                                    value = aframeObject.getAttribute('geometry').radius;
                                    break;
                            }
                        }

                        if (aframeObject.nodeName == "A-TEXT") {
                            switch (propertyName) {

                                case "value":
                                    value = aframeObject.getAttribute('text').value;
                                    break;

                                case "textColor":
                                    value = aframeObject.getAttribute('text').color;
                                    break;
                            }
                        }

                        if (aframeObject.nodeName == "A-CAMERA") {
                            switch (propertyName) {
                                case "look-controls-enabled":
                                    value = aframeObject.getAttribute('look-controls').enabled;
                                    break;
                            }
                        }

                    }
                }
            }

            return value;
        }
    });

    function createAFrameObject(node, config) {
        var protos = node.prototypes;
        var aframeObj = undefined;

        if (self.state.isAFrameClass(protos, "http://vwf.example.com/aframe/ascene.vwf")) {
            aframeObj = document.createElement('a-scene');
            self.state.scenes[node.ID] = aframeObj;


        } else if (self.state.isAFrameClass(protos, "http://vwf.example.com/aframe/acamera.vwf")) {
            aframeObj = document.createElement('a-camera');
        } else if (self.state.isAFrameClass(protos, "http://vwf.example.com/aframe/acursor.vwf")) {
            aframeObj = document.createElement('a-cursor');
        } else if (self.state.isAFrameClass(protos, "http://vwf.example.com/aframe/asky.vwf")) {
            aframeObj = document.createElement('a-sky');
        } else if (self.state.isAFrameClass(protos, "http://vwf.example.com/aframe/abox.vwf")) {
            aframeObj = document.createElement('a-box');
        } else if (self.state.isAFrameClass(protos, "http://vwf.example.com/aframe/aplane.vwf")) {
            aframeObj = document.createElement('a-plane');
        } else if (self.state.isAFrameClass(protos, "http://vwf.example.com/aframe/atext.vwf")) {
            aframeObj = document.createElement('a-text');
        } else if (self.state.isAFrameClass(protos, "http://vwf.example.com/aframe/asphere.vwf")) {
            aframeObj = document.createElement('a-sphere');
        } else if (self.state.isAFrameClass(protos, "http://vwf.example.com/aframe/aentity.vwf")) {
            aframeObj = document.createElement('a-entity');
        }

        aframeObj.id = node.name;
        return aframeObj;
    }

    function addNodeToHierarchy(node) {

        if (node.aframeObj) {
            if (self.state.nodes[node.parentID] !== undefined) {
                var parent = self.state.nodes[node.parentID];
                if (parent.aframeObj) {

                    if (parent.children === undefined) {
                        parent.children = [];
                    }
                    parent.children.push(node.ID);
                    //console.info( "Adding child: " + childID + " to " + nodeID );
                    parent.aframeObj.appendChild(node.aframeObj);
                }
            }
            if (node.aframeObj.nodeName !== "A-SCENE") {
                node.scene = self.state.scenes[self.kernel.application()];
            }

        }

    }


    function getPrototypes(kernel, extendsID) {
        var prototypes = [];
        var id = extendsID;

        while (id !== undefined) {
            prototypes.push(id);
            id = kernel.prototype(id);
        }
        return prototypes;
    }

    function isNodeDefinition(prototypes) {
        var found = false;
        if (prototypes) {
            for (var i = 0; i < prototypes.length && !found; i++) {
                found = (prototypes[i] == "http://vwf.example.com/aframe/node.vwf");
            }
        }
        return found;
    }


    // Changing this function significantly from the GLGE code
    // Will search hierarchy down until encountering a matching child
    // Will look into nodes that don't match.... this might not be desirable
    function FindChildByName(obj, childName, childType, recursive) {

        var child = undefined;
        if (recursive) {

            // TODO: If the obj itself has the child name, the object will be returned by this function
            //       I don't think this this desirable.

            if (nameTest.call(this, obj, childName)) {
                child = obj;
            } else if (obj.children && obj.children.length > 0) {
                for (var i = 0; i < obj.children.length && child === undefined; i++) {
                    child = FindChildByName(obj.children[i], childName, childType, true);
                }
            }
        } else {
            if (obj.children) {
                for (var i = 0; i < obj.children.length && child === undefined; i++) {
                    if (nameTest.call(this, obj.children[i], childName)) {
                        child = obj.children[i];
                    }
                }
            }
        }
        return child;

    }

    function nameTest(obj, name) {
        if (obj.name == "") {
            return (obj.parent.name + "Child" == name);
        } else {
            return (obj.name == name || obj.id == name || obj.vwfID == name);
        }
    }

});

