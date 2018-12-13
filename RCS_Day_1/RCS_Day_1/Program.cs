using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RCS_Day_1
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Ievadiet pirmo skaitli:");
            String input = Console.ReadLine();
            int x = Convert.ToInt32(input);
            Console.WriteLine("Ievadiet otro skaitli:");
            String input2 = Console.ReadLine();
            int y = Convert.ToInt32(input2);
            

            int result = OtraisUzdevums( x, y);
            Console.WriteLine(result);


            Console.ReadLine();
        }

        static void PirmaisUzdevums()
        {
            Console.WriteLine("Ievadiet savu vārdu:");
            String vards = Console.ReadLine();
            Console.WriteLine("Sveiks, " + vards + "!");

            Console.ReadLine();
        }

        static int OtraisUzdevums(int x, int y)
        {
            Console.WriteLine("Ievadiet + lai saskaitītu vai - lai atņemtu:");
            String input3 = Console.ReadLine();

            if (input3 == "+")
            {
                return x + y;
            }
            else
            {
                return x - y;
            }



        }

        static int Piemers()
        {
            return 4 + 3;
        }

        static int Piemers2(int a, int b)
        {
            return a + b;
        }

        static void Piemers3()
        {
            Console.WriteLine("Ievadiet kko:");
            String ievade = Console.ReadLine();
            int a = 5;
            if ( ievade == "vii")
            {
                Console.WriteLine("1");
            }
            else
            {
                Console.WriteLine("2");
            }
        }
    }
}
