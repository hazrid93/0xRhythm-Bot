INSERT INTO song
(name, status, created_at, deleted_at)
VALUES('zc1z', 'active', datetime('now'), null);


CREATE TABLE song (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL,
	status TEXT NOT NULL,
	created_at TEXT NOT NULL,
	deleted_at TEXT
);

CREATE TABLE server (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL,
	status TEXT NOT NULL,
	created_at TEXT NOT NULL,
	deleted_at TEXT,
	song_id INTEGER ,
	FOREIGN KEY (song_id) REFERENCES song (id) 
);

create index idx_song_name on song(name);

drop index sqlite_autoindex_playlist_1;

ALTER TABLE playlist ADD playlist_id INTEGER PRIMARY KEY;

 explain query plan SELECT * from playlist where name = 'ali';
 

INSERT INTO server
(name, status, created_at, deleted_at, song_id)
VALUES('2244', 'active', datetime('now'), null, (SELECT id from song where name = 'zc1z'));

select s1.*, s2.* from server s1 
left join song s2 on s1.song_id = s2.id where s1.name = 1123;

select s1.*, s2.* , COUNT() from server s1 
left join song s2 on s1.song_id = s2.id
group by s1.name;