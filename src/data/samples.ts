export interface SampleManuscript {
  id: string;
  name: string;
  badge: string;
  description: string;
  text: string;
}

export const SAMPLE_MANUSCRIPTS: SampleManuscript[] = [
  {
    id: 'sample-rejected',
    name: 'Exemple 1 : Soumission Non-Conforme (Refusé - Modifications majeures requises)',
    badge: 'À corriger d’urgence',
    description: 'Comporte des guillemets dans le titre, puces pour les auteurs, pas de téléphone/ORCID 16 chiffres, sous-titres et citations dans le résumé > 250 mots, chiffres romains dans les sections, tableaux en chiffres arabes, citations [1], et absence des 6 sections de fin d’article.',
    text: `« Évaluation épidémiologique du paludisme chez les femmes enceintes dans la zone de santé de Kingasani à Kinshasa »

Auteurs :
- Dr Jean-Paul Ilunga (Université de Kinshasa)
- Professeur Marie Masika (Institut National de Recherche Biomédicale)
- Dr Alain Tshilombo (Hôpital Général de Kinshasa)

Email : ilunga@gmail.com

Résumé :
Objectif : Dans notre travail de recherche, nous avons voulu comprendre comment le paludisme affecte les femmes enceintes vivant dans la commune de Kimbanseke à Kinshasa.
Méthode : Nous avons collecté des données cliniques sur une période de douze mois entre janvier et décembre 2024 auprès de 420 patientes consentantes. Comme le soulignent les travaux de l'OMS (2022) et de Mukendi et al. (2020), la chimio-prévention saisonnière reste un défi logistique majeur en Afrique subsaharienne.
Résultats : Nos investigations révèlent un taux d'infection parasitaire de 34,2 %, particulièrement concentré chez les primigestes où nous avons décelé une anémie sévère associée dans 18,5 % des cas. De plus, nos entretiens nous ont permis de constater que plus de 60 % des mères interrogées n'utilisent pas régulièrement les moustiquaires imprégnées d'insecticide à longue durée d'action (MILDA) en raison de facteurs socioculturels et de ruptures d'approvisionnement dans les centres de santé de référence.
Conclusion : Nous recommandons vivement aux autorités sanitaires congolaises de renforcer la sensibilisation communautaire et d'assurer la gratuité effective du traitement préventif intermittent à la sulfadoxine-pyriméthamine afin de réduire drastiquement la mortalité néonatale et maternelle dans les zones périurbaines défavorisées de la capitale.

Mots-clés : Paludisme, Grossesse, Kinshasa, Épidémiologie, Prévention.

I. Introduction
I.1 Contexte épidémiologique
Le paludisme à Plasmodium falciparum constitue l'une des causes prépondérantes de morbidité maternelle en République Démocratique du Congo. Dans notre pays, les zones marécageuses de Kinshasa offrent des gîtes larvaires permanents.
I.2 Objectifs de l'équipe
Nous avons décidé d'analyser l'incidence chez les femmes enceintes.

II. Matériels et méthodes
Nous avons mené une étude transversale descriptive. Nous avons sélectionné 420 femmes enceintes venues en consultation prénatale.

Tableau 1 : Répartition des patientes selon la tranche d'âge
[Données du tableau présentées ici]

III. Résultats
Nos analyses statistiques démontrent une prévalence de 34,2 %.

Figure I : Évolution mensuelle de la parasitémie
[Graphique présenté ici]

IV. Discussion
Nos résultats corroborent ceux obtenus par Kabamba à Lubumbashi [1]. Nous pensons cependant que notre échantillon est plus représentatif. Comme l'indique l'OMS [2], la prévention reste essentielle.

V. Conclusion
Nous estimons que nos données permettent d'éclairer les décideurs sanitaires.

Références :
[1] Kabamba, M. (2019). Étude parasitaire au Katanga. Revue Congolaise de Médecine, 12, 45-50.
[2] OMS. (2022). Rapport mondial sur le paludisme. Genève : Organisation Mondiale de la Santé.`,
  },
  {
    id: 'sample-reserves',
    name: 'Exemple 2 : Soumission Conforme avec Réserves (Modifications Mineures)',
    badge: 'Réserves mineures',
    description: 'Structure IMRAD globalement respectée mais manque la traduction anglaise du titre, le numéro de téléphone de l’auteur correspondant, et quelques sections de fin d’article à formaliser avec initiales.',
    text: `Caractérisation physico-chimique et valorisation des rejets miniers cuprifères de Kolwezi

Kambale V.M.¹*, Mbuyi K.T.², Ngoie D.S.¹
¹Département de Métallurgie, Faculté Polytechnique, Université de Lubumbashi, Lubumbashi, RDC
²Centre de Recherches Géologiques et Minières (CRGM), Kinshasa, RDC
*Auteur correspondant : victor.kambale@unilu.cd | ORCID: 0000-0002-4891-2301
Mbuyi K.T. : ORCID: 0000-0001-9012-4412
Ngoie D.S. : ORCID: 0000-0003-1120-8902

Résumé :
La gestion durable des rejets miniers issus de la flottation des minerais de cuivre et de cobalt constitue un enjeu environnemental prioritaire dans la province du Lualaba. Cette étude présente la caractérisation minéralogique et granulométrique de 15 échantillons de stériles prélevés sur les digues de Kolwezi. Les analyses par diffraction des rayons X révèlent des teneurs résiduelles moyennes de 0,85 % en cuivre et 0,12 % en cobalt. Les tests de lixiviation acide démontrent un taux de récupération de 78,4 % du cuivre soluble après 24 heures sous agitation régulée. Par ailleurs, la fraction inerte présente des propriétés géotechniques compatibles avec une réincorporation comme agrégats dans les géopolymères et matériaux routiers. Ces résultats confirment la faisabilité d'un retraitement combiné hydrométallurgique et valorisation des anciens parcs à résidus miniers.

Mots-clés : Rejets miniers, Cuivre, Lixiviation, Kolwezi, Valorisation environnementale.

Abstract :
Sustainable management of tailings from copper-cobalt flotation represents an environmental priority in Lualaba province. This study presents the mineralogical and particle size characterization of 15 samples collected from Kolwezi tailing dams. X-ray diffraction analyses reveal residual average grades of 0.85% copper and 0.12% cobalt. Acid leaching tests demonstrate a recovery rate of 78.4% soluble copper after 24 hours under regulated agitation. Furthermore, the inert mineral fraction exhibits geotechnical properties suitable for incorporation into road construction geopolymers. These findings confirm the feasibility of combined hydrometallurgical recycling and waste valorization.

Keywords : Mine tailings, Copper, Leaching, Kolwezi, Environmental valorization.

1. Introduction
L'exploitation industrielle des gisements sédimentaires de la ceinture cuprifère centrafricaine génère d'importants volumes de résidus stockés dans des bassins de décantation à ciel ouvert. L'exposition aux eaux pluviales favorise la genèse de drainage minier acide et le lessivage de métaux traces (Kalenga et al., 2021 ; Shen & Wang, 2022). Des travaux antérieurs ont exploré les procédés de retraitement hydrométallurgique (Banza et al., 2018). La présente étude vise à déterminer les conditions optimales de lixiviation sulfurique et à quantifier le potentiel de valorisation minérale.

2. Matériels et méthodes
2.1 Échantillonnage et préparation
Quinze carottes de rejets ont été prélevées selon un carroyage régulier de 50 m x 50 m.
2.2 Protocole de lixiviation
Les essais ont été conduits dans des réacteurs agités à température ambiante (25 °C).

Tableau I : Caractéristiques minéralogiques moyennes des résidus de Kolwezi
[Données du tableau positionnées ici]

3. Résultats
Les concentrations résiduelles en cuivre oscillent entre 0,62 % et 1,14 %. Le rendement d'extraction acide atteint son optimum à pH 1,5.

[Graphique positionné ici]
Figure 1 : Cinétique de dissolution du cuivre en milieu sulfurique

4. Discussion
L'efficacité d'extraction obtenue (78,4 %) corrobore les modèles cinétiques décrits par Banza et al. (2018). La dissolution de la malachite prédomine sur celle des phases sulfurées résiduelles.

5. Conclusion
Le retraitement des digues de Kolwezi offre une opportunité de remédiation environnementale tout en valorisant les sous-produits minéraux.

Remerciements :
Les auteurs remercient la Faculté Polytechnique de l'Université de Lubumbashi pour l'accès aux plateformes analytiques.

Financement :
Cette recherche a bénéficié de l'appui financier du Fonds National pour la Recherche Scientifique (FNRS-RDC, Subvention n° 2023-MIN-04).

Conflit d'Intérêt :
Les auteurs déclarent n'avoir aucun conflit d'intérêt financier ou personnel.

Considérations d'Éthiques :
Les autorisations de prélèvement sur site ont été délivrées par la division provinciale des mines du Lualaba.

ORCID des Auteurs :
Kambale V.M. : 0000-0002-4891-2301
Mbuyi K.T. : 0000-0001-9012-4412
Ngoie D.S. : 0000-0003-1120-8902

Contribution des Auteurs :
Victor Kambale a conçu l'étude et rédigé le manuscrit. Mbuyi a réalisé les analyses et Ngoie a supervisé les tests métallurgiques.

Références :
Banza, A. N., Gock, E., & Kongolo, K. (2018). Base metals recovery from copper smelter slag by oxidizing leaching. Hydrometallurgy, 178, 12–20. https://doi.org/10.1016/j.hydromet.2018.03.011
Kalenga, M., Mwema, F., & Tshibal, M. (2021). Characterization of tailing dams in Katanga copperbelt. Journal of African Earth Sciences, 180, 104230. https://doi.org/10.1016/j.jafrearsci.2021.104230
Shen, H., & Wang, Q. (2022). Sustainable mineral waste management: A review. Minerals Engineering, 189, 107870. https://doi.org/10.1016/j.mineng.2022.107870`,
  },
  {
    id: 'sample-compliant',
    name: 'Exemple 3 : Soumission Strictement Conforme (Modèle d’Excellence RCST)',
    badge: '100% Conforme',
    description: 'Modèle irréprochable : titre bilingue sans guillemets, auteurs sans puces avec exposants, correspondant avec *, email, téléphone et ORCID 16 chiffres, résumé bilingue < 250 mots sans sous-titre ni référence, IMRAD numéroté en chiffres arabes, Tableau I avant / Figure 1 après, les 6 sections de fin d’article avec initiales, et APA 7 parfait.',
    text: `Modélisation du potentiel de production photovoltaïque décentralisée en milieu périurbain à Kinshasa
Modeling of Decentralized Photovoltaic Production Potential in Peri-Urban Kinshasa

Kalonji M.T.¹*, Lukusa B.K.², Mukendi P.A.¹
¹Département de Génie Électrique, Faculté Polytechnique, Université de Kinshasa, Kinshasa, République Démocratique du Congo
²Centre de Recherches en Énergies Renouvelables, Institut Supérieur des Techniques Appliquées, Kinshasa, République Démocratique du Congo
*Auteur correspondant : marcel.kalonji@unikin.ac.cd | Tél : +243 812 345 678 | ORCID: 0000-0002-7634-1920
Lukusa B.K. : benjamin.lukusa@ista.cd | ORCID: 0000-0001-8521-9043
Mukendi P.A. : patrick.mukendi@unikin.ac.cd | ORCID: 0000-0003-4109-6712

Résumé :
L'accès à une énergie électrique stable constitue un verrou majeur du développement socio-économique dans la périphérie de Kinshasa. La présente étude évalue la viabilité technique et le rendement énergétique de micro-réseaux photovoltaïques solaires décentralisés implantés dans la commune de Maluku. Les données d'irradiation globale horizontale (GHI) issues des capteurs au sol et de la base satellitaire ERA5 sur la période 2018-2023 ont été intégrées dans un algorithme d'optimisation techno-économique sous contraintes thermiques et de nébulosité équatoriale. Les simulations indiquent un gisement moyen de 4,82 kWh/m²/jour, permettant une production annuelle estimée à 1 420 kWh par kilowatt-crête installé pour des modules monocristallins inclinés à 5° vers le nord. Le facteur de charge atteint 16,2 %, avec un taux de couverture de la demande diurne de 87,4 %. L'intégration d'un stockage électrochimique lithium-fer-phosphate de 2,4 kWh par ménage autorise une autonomie nocturne de 94 % sans recours aux groupes électrogènes diesel. Ces résultats confirment la pertinence des micro-réseaux solaires hybrides pour l'électrification rurale et périurbaine en zone équatoriale congolaise.

Mots-clés : Énergie photovoltaïque, Micro-réseau, Irradiation solaire, Kinshasa, Électrification décentralisée.

Abstract :
Access to reliable electrical power remains a fundamental constraint for socio-economic development in peri-urban Kinshasa. This study investigates the technical feasibility and energy yield of decentralized solar photovoltaic microgrids in the Maluku municipality. Global horizontal irradiance data recorded by ground pyranometers and the ERA5 reanalysis database between 2018 and 2023 were incorporated into a techno-economic optimization algorithm accounting for equatorial cloud cover and ambient temperature. Simulations indicate an average irradiance of 4.82 kWh/m²/day, yielding an estimated annual generation of 1,420 kWh per peak kilowatt for monocrystalline panels tilted at 5° North. The capacity factor reaches 16.2%, providing an 87.4% daytime load coverage. Incorporating a 2.4 kWh lithium-iron-phosphate battery storage system per household secures 94% nocturnal power autonomy, eliminating local diesel generator reliance. These findings validate the applicability of decentralized solar microgrids for sustainable rural and peri-urban electrification across equatorial Central Africa.

Keywords : Photovoltaic energy, Microgrid, Solar irradiance, Kinshasa, Decentralized electrification.

1. Introduction
Le déficit structurel d'électrification en République Démocratique du Congo affecte plus de 80 % des ménages situés dans les zones périurbaines. La dépendance historique envers les grands aménagements hydroélectriques se heurte à la vétusté des réseaux de transport et à l'éloignement des nouveaux pôles d'habitat (Mwamba & Tshimanga, 2021). Face à cette situation, l'exploitation du gisement solaire équatorial présente une alternative prometteuse (Kabuya et al., 2022). Des travaux antérieurs ont souligné l'atténuation causée par l'humidité relative élevée et la nébulosité saisonnière (Ndombe & Senga, 2020). L'objectif de la présente contribution est d'établir une modélisation fine du rendement énergétique d'une grappe de micro-réseaux à Maluku, en tenant compte des profils de charge réels mesurés sur le terrain.

2. Matériels et méthodes
2.1 Données radiométriques et météorologiques
Les mesures in situ proviennent d'une station radiométrique secondaire installée à Maluku, couplée aux réanalyses ERA5-Land.
2.2 Modélisation du système photovoltaïque
Le comportement des modules en silicium monocristallin a été modélisé à l'aide de l'équation à simple diode corrigée en température.
2.3 Profils de consommation communautaire
Des compteurs communicants ont relevé la demande énergétique horaire de 50 ménages sur une période de 180 jours consécutifs.

Tableau I : Paramètres techniques des installations solaires simulées à Maluku
[Tableau positionné après le titre Tableau I et avant son commentaire]

3. Résultats
L'irradiation solaire annuelle moyenne mesurée s'établit à 1 760 kWh/m². Le coefficient de performance du système atteint 81,3 % en saison sèche et 74,5 % en saison des pluies en raison des températures ambiantes plus élevées.

[Illustration graphique positionnée avant la légende Figure 1]
Figure 1 : Profil moyen de production horaire et courbe de charge diurne

4. Discussion
Les rendements observés corroborent les observations documentées au Cameroun par Talla et al. (2021) et dépassent les estimations de l'Agence Internationale de l'Énergie Renouvelable (IRENA, 2022). L'absence de recours au réseau principal confère aux micro-réseaux une résilience accrue face aux délestages fréquents du réseau interconnecté de Kinshasa.

5. Conclusion
La modélisation confirme la viabilité technique et environnementale des micro-réseaux photovoltaïques pour les zones périurbaines de Kinshasa. Le déploiement à plus grande échelle requiert des mécanismes incitatifs d'investissement communautaire.

Remerciements :
Les auteurs expriment leur gratitude à la Société Nationale d'Électricité (SNEL) et au personnel technique de la station météo de Maluku pour la mise à disposition des séries chronologiques d'ensoleillement.

Financement :
Ce projet a été financé par le Ministère de la Recherche Scientifique et Innovation Technologique de la RDC dans le cadre du Programme National d'Énergies Propres (Subvention PNEP-2023-018).

Conflit d'Intérêt :
Les auteurs déclarent n'avoir aucun conflit d'intérêt financier, commercial ou académique lié à cette publication.

Considérations d'Éthiques :
Le protocole de collecte de données de consommation a reçu l'approbation du Comité d'Éthique de la Recherche de l'Université de Kinshasa (Protocole UNIKIN-CER-2023-042). Le consentement éclairé écrit a été recueilli auprès des ménages participants.

ORCID des Auteurs :
Kalonji M.T. : 0000-0002-7634-1920
Lukusa B.K. : 0000-0001-8521-9043
Mukendi P.A. : 0000-0003-4109-6712

Contribution des Auteurs :
M.T.K. a conçu l'étude, développé les modèles mathématiques et rédigé la première version du manuscrit. B.K.L. a supervisé la collecte des données radiométriques in situ et validé les algorithmes de simulation. P.A.M. a procédé à l'analyse critique des résultats et révisé l'article final.

Références :
IRENA. (2022). Renewable capacity statistics 2022. International Renewable Energy Agency. https://doi.org/10.1016/j.irena.2022.01.004
Kabuya, F. K., Mpanzu, P. N., & Ilunga, D. T. (2022). Solar irradiance modeling in the Congo Basin: Impact of cloud dynamics and aerosol optical depth. Solar Energy, 234, 112–124. https://doi.org/10.1016/j.solener.2022.01.033
Mwamba, L. C., & Tshimanga, R. M. (2021). Grid extension versus off-grid decentralized energy solutions in Central Africa. Energy Policy, 155, 112349. https://doi.org/10.1016/j.enpol.2021.112349
Ndombe, G. M., & Senga, K. J. (2020). Performance ratio of monocrystalline photovoltaic modules under humid tropical climate. Renewable Energy Focus, 33, 45–52. https://doi.org/10.1016/j.ref.2020.03.002
Talla, P. K., Bikai, J., & Nganhou, J. (2021). Techno-economic assessment of rural solar microgrids in equatorial regions. Applied Energy, 298, 117201. https://doi.org/10.1016/j.apenergy.2021.117201`,
  },
];
