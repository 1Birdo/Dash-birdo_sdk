from setuptools import setup, find_packages
import os

# Read the contents of README.md
with open(os.path.join(os.path.dirname(__file__), 'README.md'), encoding='utf-8') as f:
    long_description = f.read()

# Get package version
about = {}
with open(os.path.join(os.path.dirname(__file__), 'birdo_sdk', '__about__.py'), encoding='utf-8') as f:
    exec(f.read(), about)

setup(
    name="birdo-sdk",
    version=about['__version__'],
    description=about['__description__'],
    long_description=long_description,
    long_description_content_type='text/markdown',
    author=about['__author__'],
    license=about['__license__'],
    packages=find_packages(exclude=['tests*']),
    install_requires=[
        'psutil>=5.0.0',
        'requests>=2.25.0',
    ],
    python_requires='>=3.6',
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'Intended Audience :: System Administrators',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: 3.7',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Operating System :: OS Independent',
        'Topic :: System :: Monitoring',
        'Topic :: Software Development :: Libraries :: Python Modules',
    ],
    keywords='monitoring metrics system dashboard saas',
    project_urls={
        'Source': 'https://github.com/birdo/birdo-python-sdk',
        'Documentation': 'https://birdo.uk/docs/sdk/python',
        'Bug Reports': 'https://github.com/birdo/birdo-python-sdk/issues',
    },
)