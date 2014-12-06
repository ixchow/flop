import multiprocessing

def build(builder):
	return builder.build()

def parallel(builders):
	pool = multiprocessing.Pool()
	return pool.map(build, builders)

def serial(builders):
	return map(build, builders)
