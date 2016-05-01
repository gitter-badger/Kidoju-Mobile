/** 
 * Kendo UI v2016.1.226 (http://www.telerik.com/kendo-ui)                                                                                                                                               
 * Copyright 2016 Telerik AD. All rights reserved.                                                                                                                                                      
 *                                                                                                                                                                                                      
 * Kendo UI commercial licenses may be obtained at                                                                                                                                                      
 * http://www.telerik.com/purchase/license-agreement/kendo-ui-complete                                                                                                                                  
 * If you do not own a commercial license, this file shall be governed by the trial license terms.                                                                                                      
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       

*/

(function(f){
    if (typeof define === 'function' && define.amd) {
        define(["kendo.core"], f);
    } else {
        f();
    }
}(function(){
(function( window, undefined ) {
    kendo.cultures["sah"] = {
        name: "sah",
        numberFormat: {
            pattern: ["-n"],
            decimals: 2,
            ",": " ",
            ".": ",",
            groupSize: [3,0],
            percent: {
                pattern: ["-n%","n%"],
                decimals: 2,
                ",": " ",
                ".": ",",
                groupSize: [3,0],
                symbol: "%"
            },
            currency: {
                name: "",
                abbr: "",
                pattern: ["-n$","n$"],
                decimals: 2,
                ",": " ",
                ".": ",",
                groupSize: [3],
                symbol: "₽"
            }
        },
        calendars: {
            standard: {
                days: {
                    names: ["Өрөбүл","энидиэнньик","Оптуорунньук","Сэрэдээ","Чэппиэр","Бээтинсэ","Субуота"],
                    namesAbbr: ["Өр","Бн","Оп","Ср","Чп","Бт","Сб"],
                    namesShort: ["Өр","Бн","Оп","Ср","Чп","Бт","Сб"]
                },
                months: {
                    names: ["Тохсунньу","Олунньу","Кулун тутар","Муус устар","Ыам ыйа","Бэс ыйа","От ыйа","Атырдьах ыйа","Балаҕан ыйа","Алтынньы","Сэтинньи","Ахсынньы"],
                    namesAbbr: ["Тхс","Олн","Клн","Мсу","Ыам","Бэс","Оты","Атр","Блҕ","Алт","Сэт","Ахс"]
                },
                AM: ["КИ","ки","КИ"],
                PM: ["КК","кк","КК"],
                patterns: {
                    d: "dd.MM.yyyy",
                    D: "dddd, yyyy 'с.' MMMM d 'күнэ'",
                    F: "dddd, yyyy 'с.' MMMM d 'күнэ' H:mm:ss",
                    g: "dd.MM.yyyy H:mm",
                    G: "dd.MM.yyyy H:mm:ss",
                    m: "MMMM d 'күнэ'",
                    M: "MMMM d 'күнэ'",
                    s: "yyyy'-'MM'-'dd'T'HH':'mm':'ss",
                    t: "H:mm",
                    T: "H:mm:ss",
                    u: "yyyy'-'MM'-'dd HH':'mm':'ss'Z'",
                    y: "yyyy 'с.' MMMM",
                    Y: "yyyy 'с.' MMMM"
                },
                "/": ".",
                ":": ":",
                firstDay: 1
            }
        }
    }
})(this);
}));