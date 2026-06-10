wifo4_grade = 2.3  # Note für "Wirtschaftsinformatik 4"
externes_Rechnungswesen = 1.0  # Note für "Externes Rechnungswesen"
statistik = 1.0  # Note für "Statistik"

def truncate_one_decimal(value):
	# Keep one decimal place without rounding.
	return int(value * 10) / 10


# Grundlagen Wirtschaftsinformatik (24 ECTS)
winfo_weighted = (
	3.3 * 3
	+ 3.7 * 3
	+ 1.3 * 6
	+ 1.0 * 6
	+ wifo4_grade * 6
) / 24
winfo = truncate_one_decimal(winfo_weighted)

# Grundlagen Informatik (57 ECTS)
grundlagen_informatik_weighted = (
	2.3 * 6
	+ 2.7 * 8
	+ 3.0 * 6
	+ 1.3 * 5
	+ 1.7 * 5
	+ 1.3 * 5
	+ 2.3 * 8
	+ 2.3 * 6
	+ 2.0 * 8
) / 57
grundlagen_informatik = truncate_one_decimal(grundlagen_informatik_weighted)

# Grundlagen Betriebswirtschaftslehre (24 ECTS)
grundlagen_bwl_weighted = (
	2.3 * 6
	+ 2.3 * 6
	+ 2.3 * 6
	+ 2.3 * 6
    + externes_Rechnungswesen * 6
) / 30
grundlagen_bwl = truncate_one_decimal(grundlagen_bwl_weighted)

# Grundlagen Mathematik und Statistik (17 ECTS)
grundlagen_mathe_stat_weighted = (
	3.7 * 9
	+ 3.0 * 8
    + statistik * 8
) / 25
grundlagen_mathe_stat = truncate_one_decimal(grundlagen_mathe_stat_weighted)

# Vertiefung (12 ECTS)
vertiefung_weighted = (
	2.7 * 6
	+ 3.0 * 6
) / 12
vertiefung = truncate_one_decimal(vertiefung_weighted)

# Wahlfach (8 ECTS)
wahlfach_weighted = 1.7
wahlfach = truncate_one_decimal(wahlfach_weighted)

# Schluesselqualifikationen (9 ECTS)
sq_weighted = (
	1.3 * 1
	+ 1.0 * 4
	+ 1.0 * 2
	+ 1.0 * 2
) / 9
sq = truncate_one_decimal(sq_weighted)

# Seminar (5 ECTS)
seminar_weighted = 1.3
seminar = truncate_one_decimal(seminar_weighted)

# Aktueller Gesamtschnitt inkl. Bachelorarbeit
bachelorarbeit_weighted = 1.0

total_ects = 24 + 57 + 30 + 25 + 12 + 8 + 9 + 5 + 12
total_weighted = (
	winfo_weighted * 24
	+ grundlagen_informatik_weighted * 57
	+ grundlagen_bwl_weighted * 30
	+ grundlagen_mathe_stat_weighted * 25
	+ vertiefung_weighted * 12
	+ wahlfach_weighted * 8
	+ sq_weighted * 9
	+ seminar_weighted * 5
	+ bachelorarbeit_weighted * 12
) / total_ects
gesamt_mit_ba = truncate_one_decimal(total_weighted)

print("Wirtschaftsinformatik:", winfo)
print("Grundlagen Informatik:", grundlagen_informatik)
print("Grundlagen BWL:", grundlagen_bwl)
print("Grundlagen Mathe/Statistik:", grundlagen_mathe_stat)
print("Vertiefung:", vertiefung)
print("Wahlfach:", wahlfach)
print("Schluesselqualifikationen:", sq)
print("Seminar:", seminar)
print("Bachelorarbeit:", bachelorarbeit_weighted)
print("Gesamtschnitt (mit Bachelorarbeit):", gesamt_mit_ba)