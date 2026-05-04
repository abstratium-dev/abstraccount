-- Insert Swiss Tax Declaration Report Template

INSERT INTO T_report_template (id, name, description, template_content, created_at, updated_at)
VALUES (
    'swiss-tax-declaration-001',
    'Swiss Tax Declaration (Déclaration fiscale suisse)',
    'Swiss corporate tax declaration form with sections A (General Information), B (Net Profit), and C (Capital and Reserves)',
    CONCAT(
        '{"sections":[',
        
        -- Section A: General Information
        '{"title":"A. INDICATIONS GÉNÉRALES","level":1,"showAccounts":false},',
        '{"title":"À compléter obligatoirement selon comptes déposés à la date de bouclement","level":2,"showAccounts":false},',
        
        '{"title":"A.1 Total des créances résultant des ventes de biens et de prestations services","level":3,"accountRegex":"^1:10:110","showSubtotals":false},',
        '{"title":"A.2 Total des créances/prêts envers des actionnaires, des proches et/ou des sociétés du groupe","level":3,"accountRegex":"^1:10:13","showSubtotals":false},',
        '{"title":"A.3 Total des stocks","level":3,"accountRegex":"^1:10:120","showSubtotals":false},',
        '{"title":"A.4 Total des participations","level":3,"accountRegex":"^1:14:14","showSubtotals":false},',
        '{"title":"A.5 Total de l''actif immobilisé (sans les participations A.4)","level":3,"accountRegex":"^1:14:15","showSubtotals":false},',
        '{"title":"A.6 Total du bilan","level":3,"accountTypes":["ASSET","CASH"],"showAccounts":false},',
        '{"title":"A.7 Total des passifs transitoires / de régularisation","level":3,"accountRegex":"^2:20:23","invertSign":true,"showSubtotals":false},',
        '{"title":"A.8 Total des dettes envers des actionnaires, des proches et/ou des sociétés du groupe","level":3,"accountRegex":"^2:20:220:2210","invertSign":true,"showSubtotals":false},',
        '{"title":"A.9 Total des provisions","level":3,"accountRegex":"^2:20:24","invertSign":true,"showSubtotals":false},',
        '{"title":"A.10 Total des produits nets des ventes de biens et des prestations de services","level":3,"accountTypes":["REVENUE"],"invertSign":true,"showAccounts":false},',
        '{"title":"A.11 Total des amortissements et des corrections de valeurs","level":3,"accountRegex":"^6:6800","showSubtotals":false},',
        
        -- Section B: Net Profit
        '{"title":"B. BÉNÉFICE NET","level":1,"showAccounts":false},',
        
        '{"title":"B.1 Bénéfice net ou perte (-) selon compte de profits et pertes de l''exercice","level":3,"calculated":"netIncome","invertSign":true},',
        '{"title":"B.2 Adaptation des comptes commerciaux aux règles du droit fiscal (+ ou -)","level":3,"showAccounts":false},',
        '{"title":"B.3 Distributions dissimulées de bénéfice et avantages procurés à des tiers","level":3,"showAccounts":false},',
        '{"title":"B.4 Bénéfice net ou perte de l''exercice","level":3,"showAccounts":false},',
        '{"title":"B.5 Pertes non compensées des 7 exercices précédents (PF 2018 à 2024)","level":3,"showAccounts":false},',
        '{"title":"B.6 Bénéfice net ou perte après imputation des pertes","level":3,"showAccounts":false},',
        '{"title":"B.7 Bénéfice net imposable ou perte en Suisse","level":3,"showAccounts":false},',
        '{"title":"B.8 Bénéfice net imposable ou perte dans le canton","level":3,"showAccounts":false},',
        '{"title":"B.9 Réduction pour participation en %","level":3,"showAccounts":false},',
        
        -- Section C: Capital and Reserves
        '{"title":"C. CAPITAL ET RÉSERVES","level":1,"showAccounts":false},',
        
        '{"title":"C.0 Dividende de l''exercice selon décision de l''AG","level":3,"showAccounts":false},',
        
        '{"title":"Capital et réserves après répartition et distribution du dividende de l''exercice","level":2,"showAccounts":false},',
        
        '{"title":"C.1 Capital-actions, capital social ou parts sociales versées","level":3,"accountRegex":"^2:28:280","invertSign":true,"showAccounts":false},',
        '{"title":"C.2 Réserve générale","level":3,"accountRegex":"^2:29:290:2900","invertSign":true,"showSubtotals":false},',
        '{"title":"C.3 Autres réserves","level":3,"accountRegex":"^2:29:290:29[0-6]","invertSign":true,"showSubtotals":false},',
        '{"title":"C.4 Réserves provenant d''apports en capital","level":3,"accountRegex":"^2:29:290:2970","invertSign":true,"showSubtotals":false},',
        '{"title":"C.5 Réserve de réévaluation","level":3,"accountRegex":"^2:29:290:2950","invertSign":true,"showSubtotals":false},',
        '{"title":"C.6 Actions propres","level":3,"accountRegex":"^2:29:290:2960","showSubtotals":false},',
        '{"title":"C.7 Report de bénéfices pertes","level":3,"accountRegex":"^2:29:290:2979","invertSign":true,"showSubtotals":false},',
        '{"title":"C.8 Réserves latentes imposées comme bénéfice (+ ou -)","level":3,"showAccounts":false},',
        '{"title":"C.9 Fonds propres nets (fortune nette globale) du bilan fiscal","level":3,"accountTypes":["EQUITY"],"invertSign":true,"includeNetIncome":true,"showAccounts":false},',
        '{"title":"C.10 Capital propre dissimulé","level":3,"showAccounts":false},',
        '{"title":"C.11 Réduction du capital selon art. 118 LI","level":3,"showAccounts":false},',
        '{"title":"C.12 Capital total imposable (au minimum le capital libéré)","level":3,"showAccounts":false},',
        '{"title":"C.13 Capital imposable en Suisse","level":3,"showAccounts":false},',
        '{"title":"C.14 Capital imposable dans le canton","level":3,"showAccounts":false}',
        
        ']}'
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
