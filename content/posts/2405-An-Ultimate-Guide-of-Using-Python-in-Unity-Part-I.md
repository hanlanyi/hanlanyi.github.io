---
title: An Ultimate Guide of Using Python in Unity (Part I)
date: 2024-05-11 08:29:05
url_date: 2024-05-10
tags:
---
Hi there! I'd love to hear your thoughts. Feel free to leave a [comment](https://github.com/hanlanyi/hanlanyi.github.io/issues), even if it's just a simple 'Hi'.

Python is the most popular programming language in the world. Unity is the most popular game engine in the world. To combine these two, a user guide from Unity is all you need. A very noticable point is that the document of version 7 is way more abundant than all the ones of previous versions combined.

https://docs.unity3d.com/Packages/com.unity.scripting.python@7.0/manual/index.html

But, to work on a much harder and much more complex project, You need my guide.

## 1. Python Scripting Manager Version

The latest version of the Unity Python Scripting manager is 7.0.1; however, by searching "python" in the package manager, the extension I got was 6.0.1, which stopped updating since 2022–08–04. Since 2023–03–21, Unity release 7.0 version and updated to 7.0.1 with more features and less bugs.

If you had the same issue I had, simply go to "Package Manager" -> "+" -> "Add Package from git URL", then type "com.unity.scripting.python@7.0.1". Done.

## 2. For Anaconda Users

All the python scripts are running in a separated Unity project, which makes a very neat python coding environment without worrying about conda or venv. However, if you are a conda user like I am, please notice whether the terminal in "Project Manager" -> "Python Scripting" triggers conda virtual environment automatically.

If it does, all the pip installation will be located in the conda location. To prevent it happens, make sure deactivate the virtual env. Then, all the installations will be successfully installed in Unity's "Library/PythonInstall/Lib/site-packages".

## 3. Run a Juypter Notebook

Jupyter Notebook is my favorite brainstorming and demo testing platform, due its instant interaction and lego like code structuring layouts. Although python scripts are mostly short and easy to debug, Jupyter Notebook boosts the process even more efficient.

Install Jupyter Notebook server：

[Project Jupyter | Installing Jupyter](https://jupyter.org/install)

Jupyter Lab is recommended, or every single click opens a new tap sounds reasonable, then jupyter notebook can also be tested, although people will always choose back to Jupyter Lab.

Once it is installed, a simple "jupyter lab" on Unity python script terminal will open a web page instantly, which is the exact location of the Unity Project. All the folders and files on the left side will look familiar.

Alternatively, there is another way of using Jupyter. I personally use vscode for everything, from machine learning to Unity, even writing with the vim extension. VSCode has such a abundant extension libraries, which greatly has one for Jupyter.

Once the extension is installed, click the top right to select a kernal.

Make sure jupyter lab is still running. The extension asks the server, password, and the port. The password is the token from terminal which runs jupyter backend.

In my case is

38368ba9ca2fb4fac974672e1c0e37419d10c4baf0c1c69e

Which is the number right after "http://localhost:8888/lab?token="

Create a file with .ipynb format, for example "test.ipynb". Now you can enjoy my favorite python brainstorming and demo testing platform in Unity.

More is on the way.

If you have any comments please share it in the [issues](https://github.com/hanlanyi/hanlanyi.github.io/issues)