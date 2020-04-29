// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

class UserProfile {
    constructor() {
        this.language = "" ;
        this.save_language = false ;
        this.other="";
        //this.age = age;

        // The list of companies the user wants to review.
        //this.companiesToReview = [];
    }
}

module.exports.UserProfile = UserProfile;
