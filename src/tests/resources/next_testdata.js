var next_testdata = [

	[
		"Freeze Bug",
		["title Freeze Bug\nauthor lazugod\n\nnoaction\nrequire_player_movement\nverbose_logging\n\n========\nOBJECTS\n========\n\nBackground .\ngreen\n\nWall #\nbrown\n\nPlayer p\nwhite\n\nCrate *\norange\n\nanim\nred\n\n=======\nLEGEND\n=======\n\n=======\nSOUNDS\n=======\n\n================\nCOLLISIONLAYERS\n================\n\nBackground\nPlayer, Crate, Wall\nanim\n\n======\nRULES\n======\n\n[ anim ] -> [] again\n\n[ > Player ] -> [ > player anim ] again\n\n[ > Player | Crate ] -> Message This message won't play when pushing into a wall, but the next \"again\" will crash\n\n==============\nWINCONDITIONS\n==============\n\n=======\nLEVELS\n=======\n\n#####\n#*p.#\n#####\n",[3,1,1,3,1],"background wall:0,0,0,0,background crate:1,\n0,0,background player:2,0,0,\nbackground:3,0,0,0,0,\n","0","1702602662740.1375",[]]
	],
				
	[
		"Autowin",
		["title Autowin\nauthor lazugod\n\nnoaction\nrequire_player_movement\n\n========\nOBJECTS\n========\n\nBackground .\nblack\n\nPlayer p\nwhite\n.....\n.000.\n.000.\n00000\n.0.0.\n\nCrate c\norange\n00000\n0...0\n0...0\n0...0\n00000\n\nWall #\nbrown\n\n=======\nLEGEND\n=======\n\n=======\nSOUNDS\n=======\n\n================\nCOLLISIONLAYERS\n================\n\nBackground\nPlayer, Crate, Wall\n\n======\nRULES\n====== \n\n[ > Player | Crate ] -> [ > Player | > Crate ]\n[ > Player | Crate | no Crate no Wall ] -> Cancel Message Canceled push message\n\n==============\nWINCONDITIONS\n==============\n\nno Player\nno Wall\nno Crate\n\n=======\nLEVELS\n=======\n\n#####\n#.cp#\n#####\n\nMessage Should-be-unreachable victory\n",[1,1],"background wall:0,0,0,0,background:1,\n0,0,background crate:2,0,0,\nbackground player:3,0,0,0,0,\n","1","1702602792273.4832",[]]
	],

	];

